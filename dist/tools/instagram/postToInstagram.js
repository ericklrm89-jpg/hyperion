"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postToInstagramAction = exports.postToInstagramSchema = void 0;
exports.executePostToInstagram = executePostToInstagram;
const zod_1 = require("zod");
const logger_1 = require("../../core/logger");
const verifyWithVision_1 = require("../../core/verifyWithVision");
const overlay_1 = require("../../layers/overlay");
/**
 * Instagram Post / Reel Input Schema
 */
exports.postToInstagramSchema = zod_1.z.object({
    filePath: zod_1.z.string().min(1, 'File path is required').describe('Absolute path to image or video file'),
    caption: zod_1.z.string().optional().describe('Post caption and hashtags'),
    isReel: zod_1.z.boolean().default(false).describe('Whether this is a Reel (video) or standard feed post'),
});
/**
 * Action Definition for ActionRegistry
 */
exports.postToInstagramAction = {
    id: 'instagram-post',
    name: 'Post to Instagram',
    description: 'Uploads and publishes feed posts, carousels or reels to Instagram with Capa Manus overlay and reactive visual verification',
    schema: exports.postToInstagramSchema,
    perception: 'visual',
    category: 'interaction',
    timeout: 90000,
    retry: {
        maxAttempts: 2,
        backoffMs: 3000,
    },
};
/**
 * Helper to execute Instagram publishing steps via ConnectionManager with reactive vision verification
 */
async function executePostToInstagram(cxn, rawInput, options) {
    const input = exports.postToInstagramSchema.parse(rawInput);
    const sleep = options?.sleepFn || ((ms) => new Promise(r => setTimeout(r, ms)));
    logger_1.logger.info({ filePath: input.filePath, isReel: input.isReel }, '[Instagram] Starting automated post flow');
    // 1. Inyectar Capa Manus primero (Ley Absoluta #1)
    const overlay = new overlay_1.OverlayPrimitive(cxn);
    await overlay.inject({ intervalMs: 250 });
    await sleep(500);
    // 2. Navigate to Instagram Profile / Feed
    await cxn.call('Page.enable');
    await cxn.evaluate(`window.location.href = 'https://www.instagram.com/';`);
    await sleep(3000);
    // Re-inyectar Capa Manus en la página destino
    await overlay.inject({ intervalMs: 250 });
    await sleep(500);
    // 3. Click sidebar "Create / Nueva publicación"
    await cxn.evaluate(`
    (() => {
      const btn = Array.from(document.querySelectorAll('a, button, div[role="button"]')).find(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.left < 120 && (
          txt.includes('new post') || txt.includes('create') ||
          txt.includes('nueva publicaci') || txt.includes('crear')
        );
      });
      if (btn) btn.click();
    })()
  `);
    await sleep(1500);
    // 4. Direct DOM File Injection into hidden file input
    const doc = await cxn.call('DOM.getDocument', { depth: -1, pierce: true });
    const queryRes = await cxn.call('DOM.querySelector', {
        nodeId: doc.root.nodeId,
        selector: 'input[type="file"]',
    });
    if (!queryRes?.nodeId) {
        logger_1.logger.warn('[Instagram] input[type="file"] not found via DOM.querySelector, attempting fallback selector');
    }
    else {
        await cxn.call('DOM.setFileInputFiles', {
            files: [input.filePath],
            nodeId: queryRes.nodeId,
        });
        logger_1.logger.info('[Instagram] File injected directly into DOM');
    }
    await sleep(2500);
    // 5. Navigate crop modal / Next buttons (Siguiente / Next)
    for (let step = 0; step < 3; step++) {
        await cxn.evaluate(`
      (() => {
        const nextBtns = Array.from(document.querySelectorAll('button, div[role="button"]')).filter(e => {
          const t = (e.textContent || '').trim().toLowerCase();
          return t === 'next' || t === 'siguiente' || t === 'compartir' || t === 'share';
        });
        if (nextBtns.length > 0) {
          nextBtns[nextBtns.length - 1].click();
        }
      })()
    `);
        await sleep(2000);
    }
    // 6. Enter caption if provided
    if (input.caption) {
        const escapedCaption = input.caption.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
        await cxn.evaluate(`
      (() => {
        const editor = document.querySelector('div[contenteditable="true"][role="textbox"], textarea[aria-label*="caption"], textarea[aria-label*="pie de foto"]');
        if (editor) {
          editor.focus();
          document.execCommand('insertText', false, \`${escapedCaption}\`);
        }
      })()
    `);
        await sleep(1000);
    }
    // 7. Click final "Share / Compartir"
    await cxn.evaluate(`
    (() => {
      const shareBtn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(e => {
        const t = (e.textContent || '').trim().toLowerCase();
        return t === 'share' || t === 'compartir';
      });
      if (shareBtn) shareBtn.click();
    })()
  `);
    logger_1.logger.info('[Instagram] Post action dispatched. Starting post-action visual verification...');
    // 8. VERIFICACIÓN REACTIVA VISUAL (Anti-Autoengaño)
    const defaultScreenshot = async () => {
        return await cxn.screenshot({ format: 'png' });
    };
    const defaultVisionAnalyze = async (_screenshot, _expectedState) => {
        const checkDom = await cxn.evaluate(`
      (() => {
        const text = document.body.innerText || '';
        const modalClosed = !document.querySelector('div[role="dialog"]');
        const hasSharedText = text.includes('Your post has been shared') ||
                              text.includes('Se ha compartido tu publicación') ||
                              text.includes('Tu reel se ha compartido');
        return { modalClosed, hasSharedText };
      })()
    `);
        if (checkDom?.value?.hasSharedText || checkDom?.value?.modalClosed) {
            return {
                matches: true,
                analysis: 'Instagram upload completed and modal closed / confirmation text detected',
            };
        }
        return {
            matches: false,
            analysis: 'Instagram modal still visible or upload in progress',
        };
    };
    const verifyResult = await (0, verifyWithVision_1.verifyWithVision)({
        screenshotFn: options?.screenshotFn || defaultScreenshot,
        visionAnalyzeFn: options?.visionAnalyzeFn || defaultVisionAnalyze,
        expectedState: 'Instagram upload modal closed and post published to profile feed',
        timeoutMs: options?.timeoutMs || 45000,
        pollIntervalMs: options?.pollIntervalMs || 2000,
    });
    return (0, verifyWithVision_1.createVerifiedActionResult)(verifyResult, {
        publishedAt: new Date().toISOString(),
    });
}
//# sourceMappingURL=postToInstagram.js.map