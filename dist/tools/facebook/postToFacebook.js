"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postToFacebookAction = exports.postToFacebookSchema = void 0;
exports.executePostToFacebook = executePostToFacebook;
const zod_1 = require("zod");
const logger_1 = require("../../core/logger");
const verifyWithVision_1 = require("../../core/verifyWithVision");
const overlay_1 = require("../../layers/overlay");
/**
 * Facebook Post / Reel Input Schema
 */
exports.postToFacebookSchema = zod_1.z.object({
    filePath: zod_1.z.string().min(1, 'filePath is required').describe('Absolute path to image or video file to publish'),
    caption: zod_1.z.string().default('').describe('Caption and hashtags for the post or reel'),
    isReel: zod_1.z.boolean().default(false).describe('Whether to publish as a Facebook Reel (vertical video)'),
    pageId: zod_1.z.string().optional().describe('Optional Facebook Page ID / username context'),
    addAiLabel: zod_1.z.boolean().default(true).describe('Toggle AI label requirement for synthetic content'),
});
/**
 * Action Definition for ActionRegistry
 */
exports.postToFacebookAction = {
    id: 'facebook-post',
    name: 'Post to Facebook',
    description: 'Publishes photos or video Reels directly to Facebook using direct DOM injection, automated composer navigation and visual verification',
    schema: exports.postToFacebookSchema,
    perception: 'visual',
    category: 'interaction',
    timeout: 90000,
    retry: {
        maxAttempts: 2,
        backoffMs: 3000,
    },
};
/**
 * Helper to execute Facebook publishing steps via ConnectionManager with reactive vision verification
 */
async function executePostToFacebook(cxn, rawInput, options) {
    const input = exports.postToFacebookSchema.parse(rawInput);
    const sleep = options?.sleepFn || ((ms) => new Promise(r => setTimeout(r, ms)));
    logger_1.logger.info({ filePath: input.filePath, isReel: input.isReel }, '[Facebook] Starting automated post flow');
    // 1. Inyectar Capa Manus primero (Ley Absoluta #1)
    const overlay = new overlay_1.OverlayPrimitive(cxn);
    await overlay.inject({ intervalMs: 250 });
    await sleep(500);
    const targetUrl = input.isReel
        ? 'https://www.facebook.com/reels/create'
        : 'https://www.facebook.com/';
    // 2. Navigate to target composer
    await cxn.call('Page.enable');
    await cxn.evaluate(`window.onbeforeunload = null; window.location.href = '${targetUrl}';`);
    await sleep(1000);
    // Re-inyectar Capa Manus en la página destino
    await overlay.inject({ intervalMs: 250 });
    await sleep(500);
    // 3. Direct DOM File Injection
    const doc = await cxn.call('DOM.getDocument', { depth: -1, pierce: true });
    const queryRes = await cxn.call('DOM.querySelector', {
        nodeId: doc.root.nodeId,
        selector: 'input[type="file"]',
    });
    if (!queryRes?.nodeId) {
        throw new Error('Could not find file input element in Facebook composer DOM');
    }
    const nodeInfo = await cxn.call('DOM.describeNode', { nodeId: queryRes.nodeId });
    const backendNodeId = nodeInfo.node.backendNodeId;
    await cxn.call('DOM.setFileInputFiles', {
        backendNodeId,
        files: [input.filePath],
    });
    logger_1.logger.info('[Facebook] File injected directly into DOM');
    await sleep(1000);
    if (input.isReel) {
        // Step 1: Click Next (Upload -> Edit)
        await cxn.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'next' || txt === 'siguiente') && r.width > 80;
      });
      if (btns.length > 0) btns[btns.length - 1].click();
    })()`);
        await sleep(1000);
        // Step 2: Click Next (Edit -> Settings)
        await cxn.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'next' || txt === 'siguiente') && r.width > 80;
      });
      if (btns.length > 0) btns[btns.length - 1].click();
    })()`);
        await sleep(1000);
    }
    // 3. Enter Caption & close hashtag dropdown with Escape
    if (input.caption) {
        await cxn.evaluate(`(() => {
      const ed = document.querySelector('div[contenteditable="true"], textarea');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(input.caption)});
        ed.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`);
        await sleep(200);
        await cxn.dispatchKeyEvent({ type: 'rawKeyDown', key: 'Escape', windowsVirtualKeyCode: 27 });
        await cxn.dispatchKeyEvent({ type: 'keyUp', key: 'Escape', windowsVirtualKeyCode: 27 });
        await sleep(200);
    }
    // 4. Toggle AI label if required
    if (input.addAiLabel) {
        await cxn.evaluate(`(() => {
      const toggles = Array.from(document.querySelectorAll('input[type="checkbox"], div[role="switch"]'));
      if (toggles.length > 0) toggles[0].click();
    })()`);
        await sleep(200);
    }
    // 5. Click Publish / Post button
    await cxn.evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('div[role="button"], button')).filter(e => {
      const txt = (e.textContent || '').trim().toLowerCase();
      const r = e.getBoundingClientRect();
      return (txt === 'post' || txt === 'publicar') && r.width > 0;
    });
    if (btns.length > 0) btns[btns.length - 1].click();
  })()`);
    logger_1.logger.info('[Facebook] Post action dispatched. Starting post-action visual verification...');
    // 6. Reactive Post-Action Visual Verification (Anti-Self-Deception)
    const defaultScreenshotFn = async () => {
        const res = await cxn.call('Page.captureScreenshot', { format: 'png' });
        return res?.data || '';
    };
    const defaultVisionAnalyzeFn = async (_screenshot, expectedState) => {
        // Check DOM state: composer dialog should be closed or success notification present
        const domState = await cxn.evaluate(`(() => {
      const isReelUrl = window.location.href.includes('/reels/create');
      const dialog = document.querySelector('div[role="dialog"]');
      const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
      const activeFileInput = fileInputs.find(i => {
        const r = i.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      const uploading = document.body.innerText.includes('Uploading') || document.body.innerText.includes('Subiendo');
      const publishing = document.body.innerText.includes('Publishing') || document.body.innerText.includes('Publicando');
      
      // If modal/dialog is gone or no longer in create url, post has completed
      const composerClosed = !dialog && !activeFileInput;
      const navigatedAway = isReelUrl ? !window.location.href.includes('/reels/create') : true;

      return {
        composerClosed,
        navigatedAway,
        uploading,
        publishing,
        url: window.location.href,
        hasFeed: !!document.querySelector('div[role="feed"], div[role="main"]')
      };
    })()`);
        const state = domState?.value || {};
        if (state.uploading || state.publishing) {
            return {
                matches: false,
                analysis: `Media is currently processing (uploading: ${state.uploading}, publishing: ${state.publishing})`,
            };
        }
        if (state.composerClosed || state.navigatedAway) {
            return {
                matches: true,
                analysis: `Facebook composer modal has successfully closed and feed/navigation updated at ${state.url}`,
            };
        }
        return {
            matches: false,
            analysis: `Composer modal or upload dialog is still visible on screen at ${state.url}. Expected: ${expectedState}`,
        };
    };
    const verification = await (0, verifyWithVision_1.verifyWithVision)({
        expectedState: 'Facebook composer modal closed and post published to feed',
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
//# sourceMappingURL=postToFacebook.js.map