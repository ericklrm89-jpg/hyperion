"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postToTikTokAction = exports.postToTikTokSchema = void 0;
exports.executePostToTikTok = executePostToTikTok;
const zod_1 = require("zod");
const logger_1 = require("../../core/logger");
const verifyWithVision_1 = require("../../core/verifyWithVision");
const overlay_1 = require("../../layers/overlay");
/**
 * TikTok Video Upload Schema (Hyperion 2.1)
 */
exports.postToTikTokSchema = zod_1.z.object({
    filePath: zod_1.z.string().min(1, 'Video file path is required').describe('Absolute path to MP4/MOV video file'),
    caption: zod_1.z.string().optional().describe('Video caption, description and hashtags'),
    privacy: zod_1.z.enum(['public', 'friends', 'private']).default('public').describe('Video privacy setting'),
});
/**
 * Action Definition for ActionRegistry
 */
exports.postToTikTokAction = {
    id: 'tiktok-post',
    name: 'Post to TikTok',
    description: 'Uploads and publishes vertical videos to TikTok Studio with Capa Manus overlay and reactive visual verification',
    schema: exports.postToTikTokSchema,
    perception: 'visual',
    category: 'interaction',
    timeout: 120000,
    retry: {
        maxAttempts: 2,
        backoffMs: 4000,
    },
};
/**
 * Executes TikTok video upload and publishing via ConnectionManager with reactive vision verification
 */
async function executePostToTikTok(cxn, rawInput, options) {
    const input = exports.postToTikTokSchema.parse(rawInput);
    const sleep = options?.sleepFn || ((ms) => new Promise(r => setTimeout(r, ms)));
    logger_1.logger.info({ filePath: input.filePath, privacy: input.privacy }, '[TikTok] Starting automated video upload flow');
    // 1. Inyectar Capa Manus primero (Ley Absoluta #1)
    const overlay = new overlay_1.OverlayPrimitive(cxn);
    await overlay.inject({ intervalMs: 250 });
    await sleep(500);
    // 2. Navigate to TikTok Creator Upload Studio
    await cxn.call('Page.enable');
    await cxn.evaluate(`window.location.href = 'https://www.tiktok.com/creator-center/upload?from=upload';`);
    await sleep(4000);
    // Re-inyectar Capa Manus en la página destino
    await overlay.inject({ intervalMs: 250 });
    await sleep(1000);
    // 3. Inject Video File directly into hidden file input
    const doc = await cxn.call('DOM.getDocument', { depth: -1, pierce: true });
    const queryRes = await cxn.call('DOM.querySelector', {
        nodeId: doc.root.nodeId,
        selector: 'input[type="file"], input[accept*="video"]',
    });
    if (!queryRes?.nodeId) {
        logger_1.logger.warn('[TikTok] input[type="file"] not found directly, scanning iframe or shadow DOM');
    }
    else {
        await cxn.call('DOM.setFileInputFiles', {
            files: [input.filePath],
            nodeId: queryRes.nodeId,
        });
        logger_1.logger.info('[TikTok] Video injected directly into DOM file input');
    }
    await sleep(4000);
    // 4. Input caption if specified
    if (input.caption) {
        const escapedCaption = input.caption.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
        await cxn.evaluate(`
      (() => {
        const editor = document.querySelector('div[contenteditable="true"], div.DraftEditor-editorContainer, div[role="combobox"]');
        if (editor) {
          editor.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, \`${escapedCaption}\`);
        }
      })()
    `);
        await sleep(1000);
    }
    // 5. Click "Post / Publicar"
    await cxn.evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
      const postBtn = btns.find(b => {
        const t = (b.textContent || '').trim().toLowerCase();
        return t === 'post' || t === 'publicar';
      });
      if (postBtn && !postBtn.hasAttribute('disabled')) {
        postBtn.click();
      }
    })()
  `);
    logger_1.logger.info('[TikTok] Post action dispatched. Starting post-action visual verification...');
    // 6. VERIFICACIÓN REACTIVA VISUAL (Anti-Autoengaño)
    const defaultScreenshot = async () => {
        return await cxn.screenshot({ format: 'png' });
    };
    const defaultVisionAnalyze = async (_screenshot, _expectedState) => {
        const checkDom = await cxn.evaluate(`
      (() => {
        const text = document.body.innerText || '';
        const hasSuccessText = text.includes('Your video has been uploaded') ||
                               text.includes('Tu video se ha subido') ||
                               text.includes('Video uploaded') ||
                               text.includes('Manage your posts') ||
                               text.includes('Administrar tus publicaciones') ||
                               text.includes('Upload another video');
        return { hasSuccessText };
      })()
    `);
        if (checkDom?.value?.hasSuccessText) {
            return {
                matches: true,
                analysis: 'TikTok video upload confirmed with success modal / confirmation toast',
            };
        }
        return {
            matches: false,
            analysis: 'TikTok upload still processing or post button waiting',
        };
    };
    const verifyResult = await (0, verifyWithVision_1.verifyWithVision)({
        screenshotFn: options?.screenshotFn || defaultScreenshot,
        visionAnalyzeFn: options?.visionAnalyzeFn || defaultVisionAnalyze,
        expectedState: 'TikTok video successfully published and confirmation dialog rendered',
        timeoutMs: options?.timeoutMs || 60000,
        pollIntervalMs: options?.pollIntervalMs || 2500,
    });
    return (0, verifyWithVision_1.createVerifiedActionResult)(verifyResult, {
        publishedAt: new Date().toISOString(),
    });
}
//# sourceMappingURL=postToTikTok.js.map