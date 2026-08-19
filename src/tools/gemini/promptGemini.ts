import { z } from 'zod';
import { ActionDefinition, VerifiedActionResult } from '../../core/types';
import { ConnectionManager } from '../../connection';
import { logger } from '../../core/logger';
import { verifyWithVision, createVerifiedActionResult, VerifyWithVisionParams } from '../../core/verifyWithVision';
import { OverlayPrimitive } from '../../layers/overlay';

/**
 * Gemini Web Prompt & Media Generation Schema
 */
export const promptGeminiSchema = z.object({
  prompt: z.string().min(1, 'Prompt text is required').describe('Prompt instruction to send to Gemini Web'),
  imagePaths: z.array(z.string()).optional().describe('Optional list of absolute file paths to attach as images/assets'),
});

export type PromptGeminiInput = z.infer<typeof promptGeminiSchema>;
export type PromptGeminiRawInput = z.input<typeof promptGeminiSchema>;

export interface PromptGeminiOptions {
  screenshotFn?: () => Promise<Buffer | string>;
  visionAnalyzeFn?: VerifyWithVisionParams['visionAnalyzeFn'];
  pollIntervalMs?: number;
  timeoutMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

/**
 * Action Definition for ActionRegistry
 */
export const promptGeminiAction: ActionDefinition<typeof promptGeminiSchema> = {
  id: 'gemini-prompt',
  name: 'Prompt Gemini Web (Text & Images)',
  description: 'Interacts with Gemini Web interface, attaching reference images and waiting for response completion with visual verification',
  schema: promptGeminiSchema,
  perception: 'visual',
  category: 'interaction',
  timeout: 120000,
  retry: {
    maxAttempts: 2,
    backoffMs: 3000,
  },
};

/**
 * Executes prompt and attachment submission in Gemini Web with reactive verification
 */
export async function executePromptGemini(
  cxn: ConnectionManager,
  rawInput: PromptGeminiRawInput,
  options?: PromptGeminiOptions
): Promise<VerifiedActionResult> {
  const input = promptGeminiSchema.parse(rawInput);
  const sleep = options?.sleepFn || ((ms: number) => new Promise(r => setTimeout(r, ms)));

  logger.info({ prompt: input.prompt.slice(0, 50), imagesCount: input.imagePaths?.length || 0 }, '[Gemini] Starting prompt flow');

  // 1. Inyectar Capa Manus primero (Ley Absoluta #1)
  const overlay = new OverlayPrimitive(cxn);
  await overlay.inject({ intervalMs: 250 });
  await sleep(500);

  // 2. Attach images if specified
  if (input.imagePaths && input.imagePaths.length > 0) {
    const doc = await cxn.call('DOM.getDocument', { depth: -1, pierce: true }) as any;
    const queryRes = await cxn.call('DOM.querySelector', {
      nodeId: doc.root.nodeId,
      selector: 'input[type="file"]',
    }) as any;

    if (queryRes?.nodeId) {
      await cxn.call('DOM.setFileInputFiles', {
        files: input.imagePaths,
        nodeId: queryRes.nodeId,
      });
      logger.info({ count: input.imagePaths.length }, '[Gemini] Reference images injected into file input');
      await sleep(3000);
    }
  }

  // 3. Enter prompt text into rich-textarea
  const escapedPrompt = input.prompt.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
  await cxn.evaluate(`
    (() => {
      const editor = document.querySelector('div.ql-editor, div[contenteditable="true"], textarea.text-input-field');
      if (editor) {
        editor.focus();
        document.execCommand('insertText', false, \`${escapedPrompt}\`);
      }
    })()
  `);
  await sleep(1000);

  // 4. Click Send button
  await cxn.evaluate(`
    (() => {
      const sendBtn = document.querySelector('button[aria-label*="Enviar"], button[aria-label*="Send"], button.send-button');
      if (sendBtn) sendBtn.click();
    })()
  `);

  logger.info('[Gemini] Prompt sent. Waiting for generation response...');

  // 5. VERIFICACIÓN REACTIVA VISUAL (Anti-Autoengaño)
  const defaultScreenshot = async () => {
    return await cxn.screenshot({ format: 'png' });
  };

  const defaultVisionAnalyze = async (_screenshot: string | Buffer, _expectedState: string): Promise<{ matches: boolean; analysis: string }> => {
    const checkDom = await cxn.evaluate(`
      (() => {
        const isGenerating = !!document.querySelector('.sparkle-spinner, [aria-label*="Detener respuesta"], [aria-label*="Stop response"]');
        const responses = document.querySelectorAll('message-content, .model-response-text, .response-container');
        const hasCompletedResponse = !isGenerating && responses.length > 0;
        return { hasCompletedResponse, responseCount: responses.length };
      })()
    `) as any;

    if (checkDom?.value?.hasCompletedResponse) {
      return {
        matches: true,
        analysis: 'Gemini completed response generation and output is visible in chat stream',
      };
    }

    return {
      matches: false,
      analysis: 'Gemini is still generating or streaming response',
    };
  };

  const verifyResult = await verifyWithVision({
    screenshotFn: options?.screenshotFn || defaultScreenshot,
    visionAnalyzeFn: options?.visionAnalyzeFn || defaultVisionAnalyze,
    expectedState: 'Gemini Web finished response generation and response rendered in DOM',
    timeoutMs: options?.timeoutMs || 90000,
    pollIntervalMs: options?.pollIntervalMs || 2500,
  });

  return createVerifiedActionResult(verifyResult, {
    publishedAt: new Date().toISOString(),
  });
}
