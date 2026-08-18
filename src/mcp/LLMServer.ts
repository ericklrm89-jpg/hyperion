import { z } from 'zod';
import { Hyperion } from '../../hyperion';
import { ActionRegistry } from '../../core/ActionRegistry';
import { VisionEngine } from '../../vision/VisionEngine';
import { OverlayEngine } from '../../overlay/OverlayEngine';
import { ActionDefinition } from '../../core/types';

/**
 * LLM-Native Server Schema Definitions
 * All tools with Zod schemas for auto-documentation
 */

export const screenshotSchema = z.object({
  mode: z.enum(['viewport', 'fullpage', 'element']).default('viewport').describe('Screenshot mode'),
  selector: z.string().optional().describe('CSS selector for element mode'),
  quality: z.number().min(1).max(100).default(80).describe('JPEG/WebP quality'),
});

export const navigateSchema = z.object({
  url: z.string().url().describe('URL to navigate to'),
  waitUntil: z.enum(['load', 'networkIdle', 'DOMContentLoaded']).default('load').describe('Wait condition'),
});

export const clickSchema = z.object({
  target: z.union([
    z.object({ overlayId: z.number().describe('Overlay element ID [N]') }),
    z.object({ selector: z.string().describe('CSS selector') }),
    z.object({ x: z.number(), y: z.number() }).describe('Coordinates'),
  ]).describe('Click target (overlayId, selector, or coordinates)'),
  button: z.enum(['left', 'right', 'middle']).default('left'),
});

export const typeSchema = z.object({
  text: z.string().describe('Text to type'),
  target: z.union([
    z.object({ overlayId: z.number() }),
    z.object({ selector: z.string() }),
  ]).describe('Target element'),
  clearFirst: z.boolean().default(false).describe('Clear field before typing'),
  humanLike: z.boolean().default(true).describe('Use human-like typing speed'),
});

export const overlayInjectSchema = z.object({
  refreshIntervalMs: z.number().default(1000).describe('Refresh interval in ms'),
});

export const overlayClickSchema = z.object({
  overlayId: z.number().describe('Overlay element ID to click'),
});

export const overlayGetSchema = z.object({}).describe('Get current overlay elements');

export const visionStartSchema = z.object({
  intervalMs: z.number().default(1000).describe('Frame capture interval'),
});

export const visionStopSchema = z.object({}).describe('Stop vision streaming');

export const extractSchema = z.object({
  selector: z.string().describe('CSS selector to extract'),
  format: z.enum(['json', 'csv', 'markdown', 'html']).default('json'),
});

export const waitSchema = z.object({
  selector: z.string().describe('CSS selector to wait for'),
  timeoutMs: z.number().default(10000).describe('Timeout in ms'),
});

export const scrollSchema = z.object({
  direction: z.enum(['up', 'down', 'left', 'right']).describe('Scroll direction'),
  amount: z.number().default(500).describe('Pixels to scroll'),
  toElement: z.string().optional().describe('Scroll to element selector'),
});

export const evaluateSchema = z.object({
  expression: z.string().describe('JavaScript expression'),
  returnByValue: z.boolean().default(true),
});

/**
 * LLMServer - Universal MCP Server with Zod schemas
 */
export class LLMServer {
  private registry: ActionRegistry;
  private vision: VisionEngine;
  private overlay: OverlayEngine;
  private hyperion: Hyperion;

  constructor(hyperion: Hyperion) {
    this.hyperion = hyperion;
    this.registry = new ActionRegistry();
    this.vision = new VisionEngine(hyperion);
    this.overlay = new OverlayEngine();
    this.registerBuiltinActions();
  }

  /**
   * Register all built-in actions
   */
  private registerBuiltinActions(): void {
    // SCREENSHOT
    this.registry.register<typeof screenshotSchema>({
      id: 'screenshot',
      name: 'Take Screenshot',
      description: 'Capture current viewport as PNG. Returns base64-encoded image.',
      schema: screenshotSchema,
      perception: 'visual',
      timeout: 5000,
      category: 'visual',
    });

    // NAVIGATE
    this.registry.register<typeof navigateSchema>({
      id: 'navigate',
      name: 'Navigate to URL',
      description: 'Navigate browser to a URL. Waits for page to fully load.',
      schema: navigateSchema,
      timeout: 30000,
      retry: { maxAttempts: 2, backoffMs: 1000 },
      category: 'navigation',
    });

    // CLICK
    this.registry.register<typeof clickSchema>({
      id: 'click',
      name: 'Click Element',
      description: 'Click an element by overlay ID, selector, or coordinates. Use overlay IDs [N] when visible.',
      schema: clickSchema,
      perception: 'visual',
      timeout: 3000,
      retry: { maxAttempts: 3, backoffMs: 500 },
      category: 'interaction',
      requiresOverlay: false,
    });

    // TYPE
    this.registry.register<typeof typeSchema>({
      id: 'type',
      name: 'Type Text',
      description: 'Type text into an element. Uses human-like speed by default.',
      schema: typeSchema,
      timeout: 5000,
      retry: { maxAttempts: 2, backoffMs: 1000 },
      category: 'interaction',
    });

    // OVERLAY INJECT
    this.registry.register<typeof overlayInjectSchema>({
      id: 'overlay-inject',
      name: 'Inject Overlay',
      description: 'Inject numbered overlay on all interactive elements [0], [1], [2], etc.',
      schema: overlayInjectSchema,
      perception: 'visual',
      timeout: 5000,
      category: 'visual',
    });

    // OVERLAY GET
    this.registry.register<typeof overlayGetSchema>({
      id: 'overlay-get',
      name: 'Get Overlay Elements',
      description: 'Get current overlay element mappings.',
      schema: overlayGetSchema,
      perception: 'visual',
      timeout: 2000,
      category: 'visual',
    });

    // OVERLAY CLICK
    this.registry.register<typeof overlayClickSchema>({
      id: 'overlay-click',
      name: 'Click Overlay Element',
      description: 'Click an element by its overlay ID number.',
      schema: overlayClickSchema,
      perception: 'visual',
      timeout: 3000,
      retry: { maxAttempts: 2, backoffMs: 500 },
      category: 'interaction',
      requiresOverlay: true,
    });

    // OVERLAY KILL
    this.registry.register({
      id: 'overlay-kill',
      name: 'Remove Overlay',
      description: 'Remove overlay from page.',
      schema: z.object({}),
      timeout: 2000,
      category: 'visual',
    });

    // VISION START
    this.registry.register<typeof visionStartSchema>({
      id: 'vision-start',
      name: 'Start Vision Streaming',
      description: 'Start real-time vision stream. Continuously captures frames.',
      schema: visionStartSchema,
      perception: 'visual',
      category: 'visual',
    });

    // VISION STOP
    this.registry.register<typeof visionStopSchema>({
      id: 'vision-stop',
      name: 'Stop Vision Streaming',
      description: 'Stop real-time vision stream.',
      schema: visionStopSchema,
      category: 'visual',
    });

    // EXTRACT
    this.registry.register<typeof extractSchema>({
      id: 'extract',
      name: 'Extract Elements',
      description: 'Extract data from elements matching selector.',
      schema: extractSchema,
      timeout: 5000,
      category: 'extraction',
    });

    // WAIT
    this.registry.register<typeof waitSchema>({
      id: 'wait',
      name: 'Wait for Element',
      description: 'Wait for element to appear in DOM.',
      schema: waitSchema,
      timeout: 15000,
      category: 'utility',
    });

    // SCROLL
    this.registry.register<typeof scrollSchema>({
      id: 'scroll',
      name: 'Scroll Page',
      description: 'Scroll page or element into view.',
      schema: scrollSchema,
      timeout: 3000,
      category: 'interaction',
    });

    // EVALUATE
    this.registry.register<typeof evaluateSchema>({
      id: 'evaluate',
      name: 'Evaluate JavaScript',
      description: 'Execute JavaScript in page context.',
      schema: evaluateSchema,
      timeout: 5000,
      category: 'utility',
    });
  }

  /**
   * Execute action by ID
   */
  async executeAction(actionId: string, input: any): Promise<any> {
    return this.registry.execute(actionId, input, async (validated) => {
      switch (actionId) {
        case 'screenshot': {
          const buf = await this.hyperion.screenshot.capture({
            mode: validated.mode,
            selector: validated.selector,
            quality: validated.quality,
          });
          return {
            base64: buf.toString('base64'),
            sizeBytes: buf.length,
            mimeType: 'image/png',
          };
        }

        case 'navigate': {
          await this.hyperion.navigate.navigate({
            url: validated.url,
            waitUntil: validated.waitUntil,
          });
          const title = await this.hyperion.getPageTitle();
          return {
            url: validated.url,
            title,
            navigated: true,
          };
        }

        case 'click': {
          const target = validated.target;
          if ('overlayId' in target) {
            const clicked = await this.overlay.clickById(this.hyperion, target.overlayId);
            return { clicked, overlayId: target.overlayId };
          } else if ('selector' in target) {
            await this.hyperion.click.click(target.selector);
            return { clicked: true, selector: target.selector };
          } else {
            await this.hyperion.click.clickCoordinates(target.x, target.y);
            return { clicked: true, x: target.x, y: target.y };
          }
        }

        case 'type': {
          const target = validated.target;
          if ('overlayId' in target) {
            const elements = await this.overlay.getElements(this.hyperion);
            const el = elements.find(e => e.overlayId === target.overlayId);
            if (el) {
              await this.hyperion.type.type(el.selector, validated.text, {
                clearField: validated.clearFirst,
                humanLike: validated.humanLike,
              });
            }
          } else {
            await this.hyperion.type.type(target.selector, validated.text, {
              clearField: validated.clearFirst,
              humanLike: validated.humanLike,
            });
          }
          return { typed: validated.text };
        }

        case 'overlay-inject': {
          await this.overlay.ensureInjected(this.hyperion, {
            refreshIntervalMs: validated.refreshIntervalMs,
          });
          const elements = await this.overlay.getElements(this.hyperion);
          return {
            injected: true,
            elementCount: elements.length,
            elements: elements.slice(0, 100),
          };
        }

        case 'overlay-get': {
          if (!this.overlay.getState().injected) {
            await this.overlay.ensureInjected(this.hyperion);
          }
          const elements = await this.overlay.getElements(this.hyperion);
          return {
            elementCount: elements.length,
            elements,
          };
        }

        case 'overlay-click': {
          const clicked = await this.overlay.clickById(this.hyperion, validated.overlayId);
          return { clicked, overlayId: validated.overlayId };
        }

        case 'overlay-kill': {
          await this.overlay.kill(this.hyperion);
          return { killed: true };
        }

        case 'vision-start': {
          this.vision.startStreaming(validated.intervalMs);
          return {
            streaming: true,
            intervalMs: validated.intervalMs,
          };
        }

        case 'vision-stop': {
          this.vision.stopStreaming();
          return { streaming: false };
        }

        case 'extract': {
          const elements = await this.hyperion.eval(
            `Array.from(document.querySelectorAll('${validated.selector}')).map(el => ({\n            text: el.textContent,\n            html: el.innerHTML,\n            className: el.className,\n            id: el.id,\n          }))`
          );
          return {
            format: validated.format,
            count: elements?.value?.length || 0,
            data: elements?.value || [],
          };
        }

        case 'wait': {
          const found = await this.hyperion.navigate.waitForSelector(
            validated.selector,
            validated.timeoutMs
          );
          return {
            found,
            selector: validated.selector,
          };
        }

        case 'scroll': {
          if (validated.toElement) {
            await this.hyperion.scroll.scrollIntoView(validated.toElement);
          } else {
            const deltaY = validated.direction === 'down' ? validated.amount : -validated.amount;
            await this.hyperion.scroll.scroll({ deltaY });
          }
          return {
            scrolled: true,
            direction: validated.direction,
            amount: validated.amount,
          };
        }

        case 'evaluate': {
          const result = await this.hyperion.eval(validated.expression);
          return {
            result: result?.value || result,
          };
        }

        default:
          throw new Error(`Action not implemented: ${actionId}`);
      }
    }, {
      captureScreenshots: true,
      beforeScreenshot: () => this.hyperion.screenshot.capture({ mode: 'viewport' }),
      afterScreenshot: () => this.hyperion.screenshot.capture({ mode: 'viewport' }),
    });
  }

  /**
   * Get all action definitions
   */
  getActionDefinitions() {
    return this.registry.getDefinitions();
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit = 100) {
    return this.registry.getExecutionHistory(limit);
  }

  /**
   * Get server stats
   */
  getStats() {
    return {
      actions: this.registry.getStats(),
      vision: this.vision.getStats(),
      overlay: this.overlay.getState(),
    };
  }
}
