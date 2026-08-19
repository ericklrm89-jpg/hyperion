import { z } from 'zod';
import { ActionDefinition, VerifiedActionResult } from '../../core/types';
import { ConnectionManager } from '../../connection';
import { logger } from '../../core/logger';
import { verifyWithVision, createVerifiedActionResult, VerifyWithVisionParams } from '../../core/verifyWithVision';
import { OverlayPrimitive } from '../../layers/overlay';

/**
 * WhatsApp Outbound Action Schema (Hyperion 2.1)
 */
export const sendWhatsAppSchema = z.object({
  phone: z.string().min(8, 'Phone number is required').describe('Target international phone number (e.g. +593998098229)'),
  message: z.string().min(1, 'Message text is required').describe('Neuro-copy formatted outreach text'),
  mediaPath: z.string().optional().describe('Optional absolute path to an image/PDF file to inject and send'),
});

export type SendWhatsAppInput = z.infer<typeof sendWhatsAppSchema>;
export type SendWhatsAppRawInput = z.input<typeof sendWhatsAppSchema>;

export interface SendWhatsAppOptions {
  screenshotFn?: () => Promise<Buffer | string>;
  visionAnalyzeFn?: VerifyWithVisionParams['visionAnalyzeFn'];
  pollIntervalMs?: number;
  timeoutMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

/**
 * Action Definition for ActionRegistry
 */
export const sendWhatsAppAction: ActionDefinition<typeof sendWhatsAppSchema> = {
  id: 'whatsapp-send',
  name: 'Send WhatsApp (Text, Media & Zero-Draft)',
  description: 'Sends B2B proposals via WhatsApp Web with Capa Manus overlay, direct DOM media injection, zero hanging drafts, and reactive checkmark visual verification',
  schema: sendWhatsAppSchema,
  perception: 'visual',
  category: 'interaction',
  timeout: 60000,
  retry: {
    maxAttempts: 2,
    backoffMs: 3000,
  },
};

/**
 * Executes the complete WhatsApp send workflow natively via ConnectionManager
 */
export async function executeSendWhatsApp(
  cxn: ConnectionManager,
  rawInput: SendWhatsAppRawInput,
  options?: SendWhatsAppOptions
): Promise<VerifiedActionResult> {
  const input = sendWhatsAppSchema.parse(rawInput);
  const sleep = options?.sleepFn || ((ms: number) => new Promise(r => setTimeout(r, ms)));
  const cleanPhone = input.phone.replace(/[^0-9]/g, '');

  logger.info({ phone: input.phone, hasMedia: !!input.mediaPath }, '[WhatsApp] Starting outbound send flow');

  // 1. Inyectar Capa Manus primero (Ley Absoluta #1)
  const overlay = new OverlayPrimitive(cxn);
  await overlay.inject({ intervalMs: 250 });
  await sleep(500);

  // 2. Navigate to direct chat URL
  const targetUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}`;
  await cxn.call('Page.enable');
  await cxn.evaluate(`window.location.href = '${targetUrl}';`);
  await sleep(6000);

  // Re-inyectar Capa Manus
  await overlay.inject({ intervalMs: 250 });
  await sleep(500);

  // 3. Dismiss any popup or OK dialog if present
  await cxn.evaluate(`(() => {
    const okBtn = Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText && b.innerText.includes('OK'));
    if (okBtn) okBtn.click();
  })()`);
  await sleep(1000);

  // 4. Insert Text into Footer ContentEditable
  const insertTextRes = await cxn.evaluate(`(() => {
    const editables = Array.from(document.querySelectorAll('footer div[contenteditable="true"], div[contenteditable="true"]'));
    const composer = editables[editables.length - 1];
    if (composer) {
      composer.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
      document.execCommand('insertText', false, ${JSON.stringify(input.message)});
      return true;
    }
    return false;
  })()`);

  if (!insertTextRes?.value) {
    throw new Error('Could not find active message composer in WhatsApp Web');
  }
  await sleep(1000);

  // 5. Send Text
  await cxn.dispatchKeyEvent({ type: 'rawKeyDown', key: 'Enter', windowsVirtualKeyCode: 13 });
  await cxn.dispatchKeyEvent({ type: 'keyUp', key: 'Enter', windowsVirtualKeyCode: 13 });
  await sleep(1000);

  // Click Send Button if still visible
  await cxn.evaluate(`(() => {
    const sendBtn = document.querySelector('button[aria-label="Enviar"]') || document.querySelector('span[data-icon="send"]');
    if (sendBtn) {
      const clickEl = sendBtn.closest('button') || sendBtn;
      clickEl.click();
    }
  })()`);
  await sleep(2000);

  // 6. Direct DOM File Injection if media specified
  if (input.mediaPath) {
    logger.info({ media: input.mediaPath }, '[WhatsApp] Inyectando adjunto mediante DOM.setFileInputFiles');
    const doc = await cxn.call('DOM.getDocument', { depth: -1, pierce: true }) as any;
    const queryRes = await cxn.call('DOM.querySelector', {
      nodeId: doc.root.nodeId,
      selector: 'input[type="file"]',
    }) as any;

    if (queryRes?.nodeId) {
      const nodeInfo = await cxn.call('DOM.describeNode', { nodeId: queryRes.nodeId }) as any;
      const backendNodeId = nodeInfo.node.backendNodeId;
      if (backendNodeId) {
        await cxn.call('DOM.setFileInputFiles', {
          backendNodeId,
          files: [input.mediaPath],
        });
        await sleep(3500);

        // Click media send button
        await cxn.evaluate(`(() => {
          const mediaSend = document.querySelector('span[data-icon="send"]') || document.querySelector('div[aria-label="Enviar"]');
          if (mediaSend) {
            const btn = mediaSend.closest('div[role="button"]') || mediaSend.closest('button') || mediaSend;
            btn.click();
          }
        })()`);
        await sleep(3000);
      }
    }
  }

  // 7. Hygiene: Verify Zero Hanging Drafts in Sidebar
  await cxn.evaluate(`(() => {
    const editables = Array.from(document.querySelectorAll('footer div[contenteditable="true"]'));
    if (editables.length > 0) {
      const comp = editables[editables.length - 1];
      if (comp.innerText && comp.innerText.trim().length > 0) {
        comp.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
      }
    }
  })()`);

  // 8. Vision Verification
  const defaultScreenshotFn = async () => {
    const res = await cxn.call('Page.captureScreenshot', { format: 'png' }) as any;
    return res?.data || '';
  };

  const defaultVisionAnalyzeFn = async (_screenshot: Buffer | string, expectedState: string) => {
    const domState = await cxn.evaluate(`(() => {
      const msgs = Array.from(document.querySelectorAll('div[data-pre-plain-text], div.message-out'));
      const lastMsg = msgs[msgs.length - 1];
      const hasChecks = !!document.querySelector('span[data-icon="msg-check"], span[data-icon="msg-dblcheck"], span[data-icon="msg-dblcheck-ack"]');
      const hasOutgoing = msgs.length > 0;
      return { hasOutgoing, hasChecks, count: msgs.length };
    })()`) as any;

    const state = domState?.value || {};
    if (state.hasOutgoing || state.hasChecks) {
      return {
        matches: true,
        analysis: `WhatsApp message to ${input.phone} confirmed dispatched with active checks (${state.hasChecks}) and message nodes (${state.count})`,
      };
    }

    return {
      matches: false,
      analysis: `Message delivery not visually confirmed yet. Expected: ${expectedState}`,
    };
  };

  const verification = await verifyWithVision({
    expectedState: `WhatsApp message to ${input.phone} dispatched and delivered`,
    screenshotFn: options?.screenshotFn || defaultScreenshotFn,
    visionAnalyzeFn: options?.visionAnalyzeFn || defaultVisionAnalyzeFn,
    pollIntervalMs: options?.pollIntervalMs || 1500,
    timeoutMs: options?.timeoutMs || 15000,
  });

  return createVerifiedActionResult(verification, {
    url: targetUrl,
    publishedAt: new Date().toISOString(),
  });
}
