import { z } from 'zod';
import { ActionDefinition } from '../../core/types';
import { ConnectionManager } from '../../connection';
import { logger } from '../../core/logger';

/**
 * Facebook Post / Reel Input Schema
 */
export const postToFacebookSchema = z.object({
  filePath: z.string().min(1, 'filePath is required').describe('Absolute path to image or video file to publish'),
  caption: z.string().default('').describe('Caption and hashtags for the post or reel'),
  isReel: z.boolean().default(false).describe('Whether to publish as a Facebook Reel (vertical video)'),
  pageId: z.string().optional().describe('Optional Facebook Page ID / username context'),
  addAiLabel: z.boolean().default(true).describe('Toggle AI label requirement for synthetic content'),
});

export type PostToFacebookInput = z.infer<typeof postToFacebookSchema>;

/**
 * Action Definition for ActionRegistry
 */
export const postToFacebookAction: ActionDefinition<typeof postToFacebookSchema> = {
  id: 'facebook-post',
  name: 'Post to Facebook',
  description: 'Publishes photos or video Reels directly to Facebook using direct DOM injection and automated multi-step composer navigation',
  schema: postToFacebookSchema,
  perception: 'visual',
  category: 'interaction',
  timeout: 90000,
  retry: {
    maxAttempts: 2,
    backoffMs: 3000,
  },
};

/**
 * Helper to execute Facebook publishing steps via ConnectionManager
 */
export async function executePostToFacebook(
  cxn: ConnectionManager,
  input: PostToFacebookInput
): Promise<{ success: boolean; url: string; publishedAt: string }> {
  logger.info({ filePath: input.filePath, isReel: input.isReel }, '[Facebook] Starting automated post flow');

  const targetUrl = input.isReel
    ? 'https://www.facebook.com/reels/create'
    : 'https://www.facebook.com/';

  // 1. Navigate to target composer
  await cxn.call('Page.enable');
  await cxn.evaluate(`window.onbeforeunload = null; window.location.href = '${targetUrl}';`);
  await new Promise(r => setTimeout(r, 6000));

  // 2. Direct DOM File Injection
  const doc = await cxn.call('DOM.getDocument', { depth: -1, pierce: true }) as any;
  const queryRes = await cxn.call('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]',
  }) as any;

  if (!queryRes?.nodeId) {
    throw new Error('Could not find file input element in Facebook composer DOM');
  }

  const nodeInfo = await cxn.call('DOM.describeNode', { nodeId: queryRes.nodeId }) as any;
  const backendNodeId = nodeInfo.node.backendNodeId;

  await cxn.call('DOM.setFileInputFiles', {
    backendNodeId,
    files: [input.filePath],
  });

  logger.info('[Facebook] File injected directly into DOM');
  await new Promise(r => setTimeout(r, input.isReel ? 12000 : 5000));

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
    await new Promise(r => setTimeout(r, 4000));

    // Step 2: Click Next (Edit -> Settings)
    await cxn.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'next' || txt === 'siguiente') && r.width > 80;
      });
      if (btns.length > 0) btns[btns.length - 1].click();
    })()`);
    await new Promise(r => setTimeout(r, 4000));
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
    await new Promise(r => setTimeout(r, 1000));
    await cxn.dispatchKeyEvent({ type: 'rawKeyDown', key: 'Escape', windowsVirtualKeyCode: 27 });
    await cxn.dispatchKeyEvent({ type: 'keyUp', key: 'Escape', windowsVirtualKeyCode: 27 });
    await new Promise(r => setTimeout(r, 1000));
  }

  // 4. Toggle AI label if required
  if (input.addAiLabel) {
    await cxn.evaluate(`(() => {
      const toggles = Array.from(document.querySelectorAll('input[type="checkbox"], div[role="switch"]'));
      if (toggles.length > 0) toggles[0].click();
    })()`);
    await new Promise(r => setTimeout(r, 1000));
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

  logger.info('[Facebook] Publish action dispatched, awaiting processing');
  await new Promise(r => setTimeout(r, 15000));

  return {
    success: true,
    url: targetUrl,
    publishedAt: new Date().toISOString(),
  };
}
