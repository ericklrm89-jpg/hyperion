import { z } from 'zod';
import { ActionDefinition, VerifiedActionResult } from '../../core/types';
import { ConnectionManager } from '../../connection';
import { logger } from '../../core/logger';
import { verifyWithVision, createVerifiedActionResult, VerifyWithVisionParams } from '../../core/verifyWithVision';
import { OverlayPrimitive } from '../../layers/overlay';

/**
 * TikTok Video Upload Schema (Hyperion 2.1)
 */
export const postToTikTokSchema = z.object({
  filePath: z.string().min(1, 'Video file path is required').describe('Absolute path to MP4/MOV video file'),
  caption: z.string().optional().describe('Video caption, description and hashtags'),
  privacy: z.enum(['public', 'friends', 'private']).default('public').describe('Video privacy setting'),
});

export type PostToTikTokInput = z.infer<typeof postToTikTokSchema>;
export type PostToTikTokRawInput = z.input<typeof postToTikTokSchema>;

export interface PostToTikTokOptions {
  screenshotFn?: () => Promise<Buffer | string>;
  visionAnalyzeFn?: VerifyWithVisionParams['visionAnalyzeFn'];
  pollIntervalMs?: number;
  timeoutMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

/**
 * Action Definition for ActionRegistry
 */
export const postToTikTokAction: ActionDefinition<typeof postToTikTokSchema> = {
  id: 'tiktok-post',
  name: 'Post to TikTok',
  description: 'Uploads and publishes vertical videos to TikTok Studio with Capa Manus overlay and reactive visual verification',
  schema: postToTikTokSchema,
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
export async function executePostToTikTok(
  cxn: ConnectionManager,
  rawInput: PostToTikTokRawInput,
  options?: PostToTikTokOptions
): Promise<VerifiedActionResult> {
  const input = postToTikTokSchema.parse(rawInput);
  const sleep = options?.sleepFn || ((ms: number) => new Promise(r => setTimeout(r, ms)));

  logger.info({ filePath: input.filePath, privacy: input.privacy }, '[TikTok] Starting automated video upload flow');

  // 1. Inyectar Capa Manus primero (Ley Absoluta #1)
  const overlay = new OverlayPrimitive(cxn);
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
  const doc = await cxn.call('DOM.getDocument', { depth: -1, pierce: true }) as any;
  const queryRes = await cxn.call('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"], input[accept*="video"]',
  }) as any;

  if (!queryRes?.nodeId) {
    logger.warn('[TikTok] input[type="file"] not found directly, scanning iframe or shadow DOM');
  } else {
    await cxn.call('DOM.setFileInputFiles', {
      files: [input.filePath],
      nodeId: queryRes.nodeId,
    });
    logger.info('[TikTok] Video injected directly into DOM file input');
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

  logger.info('[TikTok] Post action dispatched. Starting post-action visual verification...');

  // 6. VERIFICACIÓN REACTIVA VISUAL (Anti-Autoengaño)
  const defaultScreenshot = async () => {
    return await cxn.screenshot({ format: 'png' });
  };

  const defaultVisionAnalyze = async (_screenshot: string | Buffer, _expectedState: string): Promise<{ matches: boolean; analysis: string }> => {
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
    `) as any;

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

  const verifyResult = await verifyWithVision({
    screenshotFn: options?.screenshotFn || defaultScreenshot,
    visionAnalyzeFn: options?.visionAnalyzeFn || defaultVisionAnalyze,
    expectedState: 'TikTok video successfully published and confirmation dialog rendered',
    timeoutMs: options?.timeoutMs || 60000,
    pollIntervalMs: options?.pollIntervalMs || 2500,
  });

  return createVerifiedActionResult(verifyResult, {
    publishedAt: new Date().toISOString(),
  });
}
