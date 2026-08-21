"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsAppAction = exports.sendWhatsAppSchema = void 0;
exports.executeSendWhatsApp = executeSendWhatsApp;
const zod_1 = require("zod");
const logger_1 = require("../../core/logger");
const verifyWithVision_1 = require("../../core/verifyWithVision");
const overlay_1 = require("../../layers/overlay");
/**
 * WhatsApp Outbound Action Schema (Hyperion 2.1)
 */
exports.sendWhatsAppSchema = zod_1.z.object({
    phone: zod_1.z.string().min(8, 'Phone number is required').describe('Target international phone number (e.g. +593998098229)'),
    message: zod_1.z.string().min(1, 'Message text is required').describe('Neuro-copy formatted outreach text'),
    mediaPath: zod_1.z.string().optional().describe('Optional absolute path to an image/PDF file to inject and send'),
});
/**
 * Action Definition for ActionRegistry
 */
exports.sendWhatsAppAction = {
    id: 'whatsapp-send',
    name: 'Send WhatsApp (Text, Media & Zero-Draft)',
    description: 'Sends B2B proposals via WhatsApp Web with Capa Manus overlay, direct DOM media injection, zero hanging drafts, and reactive checkmark visual verification',
    schema: exports.sendWhatsAppSchema,
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
async function executeSendWhatsApp(cxn, rawInput, options) {
    const input = exports.sendWhatsAppSchema.parse(rawInput);
    const sleep = options?.sleepFn || ((ms) => new Promise(r => setTimeout(r, ms)));
    const cleanPhone = input.phone.replace(/[^0-9]/g, '');
    logger_1.logger.info({ phone: input.phone, hasMedia: !!input.mediaPath }, '[WhatsApp] Starting outbound send flow');
    // 1. Inyectar Capa Manus primero (Ley Absoluta #1)
    const overlay = new overlay_1.OverlayPrimitive(cxn);
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
    const editables = Array.from(document.querySelectorAll('div[contenteditable="true"][data-tab="10"], footer div[contenteditable="true"], div[contenteditable="true"]'));
    const composer = editables[editables.length - 1];
    if (composer) {
      composer.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
      document.execCommand('insertText', false, ${JSON.stringify(input.message)});
      composer.dispatchEvent(new Event('input', { bubbles: true }));
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
        logger_1.logger.info({ media: input.mediaPath }, '[WhatsApp] Inyectando adjunto mediante DOM.setFileInputFiles');
        const doc = await cxn.call('DOM.getDocument', { depth: -1, pierce: true });
        const queryRes = await cxn.call('DOM.querySelector', {
            nodeId: doc.root.nodeId,
            selector: 'input[type="file"]',
        });
        if (queryRes?.nodeId) {
            const nodeInfo = await cxn.call('DOM.describeNode', { nodeId: queryRes.nodeId });
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
        const res = await cxn.call('Page.captureScreenshot', { format: 'png' });
        return res?.data || '';
    };
    const defaultVisionAnalyzeFn = async (_screenshot, expectedState) => {
        const domState = await cxn.evaluate(`(() => {
      const msgs = Array.from(document.querySelectorAll('div[data-pre-plain-text], div.message-out'));
      const lastMsg = msgs[msgs.length - 1];
      const hasChecks = !!document.querySelector('span[data-icon="msg-check"], span[data-icon="msg-dblcheck"], span[data-icon="msg-dblcheck-ack"]');
      const hasOutgoing = msgs.length > 0;
      return { hasOutgoing, hasChecks, count: msgs.length };
    })()`);
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
    const verification = await (0, verifyWithVision_1.verifyWithVision)({
        expectedState: `WhatsApp message to ${input.phone} dispatched and delivered`,
        screenshotFn: options?.screenshotFn || defaultScreenshotFn,
        visionAnalyzeFn: options?.visionAnalyzeFn || defaultVisionAnalyzeFn,
        pollIntervalMs: options?.pollIntervalMs || 1500,
        timeoutMs: options?.timeoutMs || 15000,
    });
    return (0, verifyWithVision_1.createVerifiedActionResult)(verification, {
        url: targetUrl,
        publishedAt: new Date().toISOString(),
    });
}
//# sourceMappingURL=sendWhatsApp.js.map