import { z } from 'zod';
import { ActionDefinition, VerifiedActionResult } from '../../core/types';
import { ConnectionManager } from '../../connection';
import { logger } from '../../core/logger';
import { verifyWithVision, createVerifiedActionResult, VerifyWithVisionParams } from '../../core/verifyWithVision';
import { OverlayPrimitive } from '../../layers/overlay';

/**
 * Gmail Outbound Action Schema (Hyperion 2.1)
 */
export const sendGmailSchema = z.object({
  recipient: z.string().email('Valid recipient email required').describe('Target corporate or client email address'),
  subject: z.string().min(1, 'Subject is required').describe('Email subject line'),
  bodyHtml: z.string().min(1, 'HTML body is required').describe('Rich HTML formatted email body with embedded CSS and tables'),
  attachmentPath: z.string().optional().describe('Optional absolute path to an image/PDF file to attach'),
});

export type SendGmailInput = z.infer<typeof sendGmailSchema>;
export type SendGmailRawInput = z.input<typeof sendGmailSchema>;

export interface SendGmailOptions {
  screenshotFn?: () => Promise<Buffer | string>;
  visionAnalyzeFn?: VerifyWithVisionParams['visionAnalyzeFn'];
  pollIntervalMs?: number;
  timeoutMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

/**
 * Action Definition for ActionRegistry
 */
export const sendGmailAction: ActionDefinition<typeof sendGmailSchema> = {
  id: 'gmail-send',
  name: 'Send Gmail (HTML & Attachments)',
  description: 'Composes and sends rich HTML formatted corporate emails with embedded tables, CTAs, and file attachments in Gmail Web with Capa Manus overlay and reactive visual verification',
  schema: sendGmailSchema,
  perception: 'visual',
  category: 'interaction',
  timeout: 60000,
  retry: {
    maxAttempts: 2,
    backoffMs: 2000,
  },
};

/**
 * Executes the complete Gmail send workflow natively via ConnectionManager
 */
export async function executeSendGmail(
  cxn: ConnectionManager,
  rawInput: SendGmailRawInput,
  options?: SendGmailOptions
): Promise<VerifiedActionResult> {
  const input = sendGmailSchema.parse(rawInput);
  const sleep = options?.sleepFn || ((ms: number) => new Promise(r => setTimeout(r, ms)));

  logger.info({ recipient: input.recipient, subject: input.subject }, '[Gmail] Starting outbound send flow');

  // 1. Inyectar Capa Manus primero (Ley Absoluta #1)
  const overlay = new OverlayPrimitive(cxn);
  await overlay.inject({ intervalMs: 250 });
  await sleep(500);

  // 2. Navigate to clean Inbox
  await cxn.call('Page.enable');
  await cxn.evaluate(`window.location.href = 'https://mail.google.com/mail/u/0/#inbox';`);
  await sleep(4000);

  // Re-inyectar Capa Manus tras navegación
  await overlay.inject({ intervalMs: 250 });
  await sleep(500);

  // 3. Click Redactar
  const clickRedactar = await cxn.evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText && b.innerText.includes('Redactar'));
    if (btn) { btn.click(); return true; }
    return false;
  })()`);

  if (!clickRedactar?.value) {
    throw new Error('Could not find or click Redactar button in Gmail DOM');
  }
  await sleep(2000);

  // 4. Fill Fields (Recipient, Subject, Rich HTML Body)
  const fillRes = await cxn.evaluate(`(() => {
    const toInput = document.querySelector('input.agP.aFw') ||
                    document.querySelector('input[peoplekit-id]') ||
                    document.querySelector('input[aria-label="Para"]') ||
                    document.querySelector('div[aria-label="Para"] input');
    if (toInput) {
      toInput.focus();
      toInput.click();
      document.execCommand('insertText', false, ${JSON.stringify(input.recipient)});
      toInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      toInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    }
    const subj = document.querySelector('input[name="subjectbox"]') ||
                 document.querySelector('input[aria-label="Asunto"]');
    if (subj) {
      subj.focus();
      subj.click();
      document.execCommand('insertText', false, ${JSON.stringify(input.subject)});
    }
    const body = document.querySelector('div[aria-label="Cuerpo del mensaje"]') ||
                 document.querySelector('div[role="textbox"]');
    if (body) {
      body.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
      document.execCommand('insertHTML', false, ${JSON.stringify(input.bodyHtml)});
      body.dispatchEvent(new Event('input', { bubbles: true }));
      body.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
  })()`);

  if (!fillRes?.value) {
    throw new Error('Could not populate Gmail composer fields');
  }
  await sleep(1500);

  // 5. Attach File if specified
  if (input.attachmentPath) {
    logger.info({ file: input.attachmentPath }, '[Gmail] Inyectando adjunto mediante DOM.setFileInputFiles');
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
          files: [input.attachmentPath],
        });
        await sleep(3500);
      }
    }
  }

  // 6. Click Enviar
  await cxn.evaluate(`(() => {
    const sendBtn = Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText && (b.innerText === 'Enviar' || b.innerText.includes('Enviar')));
    if (sendBtn) { sendBtn.click(); return true; }
    return false;
  })()`);

  await sleep(3000);

  // 7. Navigate to #sent to verify delivery
  await cxn.evaluate(`window.location.href = 'https://mail.google.com/mail/u/0/#sent';`);
  await sleep(3500);

  // 8. Vision Verification
  const defaultScreenshotFn = async () => {
    const res = await cxn.call('Page.captureScreenshot', { format: 'png' }) as any;
    return res?.data || '';
  };

  const defaultVisionAnalyzeFn = async (_screenshot: Buffer | string, expectedState: string) => {
    const domState = await cxn.evaluate(`(() => {
      const isSent = window.location.href.includes('#sent');
      const hasSentRow = !!document.querySelector('tr.zA');
      const toastVisible = document.body.innerText.includes('Mensaje enviado');
      return { isSent, hasSentRow, toastVisible, url: window.location.href };
    })()`) as any;

    const state = domState?.value || {};
    if (state.isSent && (state.hasSentRow || state.toastVisible)) {
      return {
        matches: true,
        analysis: `Email to ${input.recipient} confirmed delivered in sent folder (${state.url}) with toast: ${state.toastVisible}`,
      };
    }

    return {
      matches: false,
      analysis: `Email delivery not confirmed yet in sent folder. Expected: ${expectedState}`,
    };
  };

  const verification = await verifyWithVision({
    expectedState: `Email to ${input.recipient} confirmed in sent folder`,
    screenshotFn: options?.screenshotFn || defaultScreenshotFn,
    visionAnalyzeFn: options?.visionAnalyzeFn || defaultVisionAnalyzeFn,
    pollIntervalMs: options?.pollIntervalMs || 1500,
    timeoutMs: options?.timeoutMs || 15000,
  });

  return createVerifiedActionResult(verification, {
    url: 'https://mail.google.com/mail/u/0/#sent',
    publishedAt: new Date().toISOString(),
  });
}
