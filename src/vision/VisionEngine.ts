import { EventEmitter } from 'events';
import { Hyperion } from '../hyperion';
import { VisionFrame } from '../core/types';
import { logger } from '../core/logger';

/**
 * Platform detection
 */
class PlatformDetector {
  detect(url: string): VisionFrame['platform'] {
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('facebook.com')) return 'facebook';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('whatsapp.com')) return 'whatsapp';
    return 'generic';
  }
}

/**
 * Real-Time Vision Engine
 * Captures frames, detects changes, streams to LLM
 */
export class VisionEngine extends EventEmitter {
  private hyperion: Hyperion;
  private frameBuffer: VisionFrame[] = [];
  private streaming = false;
  private lastFrame?: VisionFrame;
  private platformDetector = new PlatformDetector();
  private maxFrames = 100;

  constructor(hyperion: Hyperion) {
    super();
    this.hyperion = hyperion;
  }

  /**
   * Start streaming vision frames
   */
  async startStreaming(intervalMs = 1000, maxFrames = 100): Promise<void> {
    if (this.streaming) {
      logger.warn('[Vision] Already streaming');
      return;
    }

    this.streaming = true;
    this.maxFrames = maxFrames;
    logger.info(`[Vision] Started streaming (interval: ${intervalMs}ms, maxFrames: ${maxFrames})`);

    while (this.streaming) {
      try {
        const frame = await this.captureFrame();

        // Detect changes
        if (this.lastFrame) {
          frame.changes = this.detectChanges(this.lastFrame, frame);

          // Emit only if significant changes
          if (
            (frame.changes?.added?.length || 0) > 0 ||
            (frame.changes?.removed?.length || 0) > 0
          ) {
            this.emit('frame-changed', frame);
          }
        }

        this.frameBuffer.push(frame);
        if (this.frameBuffer.length > maxFrames) {
          this.frameBuffer.shift();
        }
        this.lastFrame = frame;

        this.emit('frame', frame);
      } catch (err) {
        this.emit('error', err);
      }

      await new Promise(r => setTimeout(r, intervalMs));
    }
  }

  /**
   * Stop streaming
   */
  stopStreaming(): void {
    this.streaming = false;
    logger.info('[Vision] Stopped streaming');
  }

  /**
   * Capture single frame with full element detection
   */
  private async captureFrame(): Promise<VisionFrame> {
    const startTime = Date.now();

    const [screenshotBuf, pageState, elementList, platformInfo] = await Promise.all([
      this.hyperion.screenshot.capture({ mode: 'viewport' }),
      this.hyperion.eval(`({
        url: window.location.href,
        title: document.title,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
        vpWidth: window.innerWidth,
        vpHeight: window.innerHeight,
      })`),
      this.hyperion.eval(`
        (function() {
          const elements = [];
          const selector = 'button, a, input, [role="button"], [role="menuitem"], [role="tab"], textarea, select, [onclick]';
          let id = 0;
          document.querySelectorAll(selector).forEach(el => {
            const rect = el.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0 && rect.top >= -100 && rect.top <= window.innerHeight + 100;
            const text = (el.textContent || el.title || el.getAttribute('aria-label') || '').slice(0, 100).trim();
            const isClickable = ['a', 'button'].includes(el.tagName.toLowerCase()) || el.onclick !== null || el.getAttribute('role') === 'button';
            
            if (isVisible) {
              elements.push({
                id: id++,
                tag: el.tagName.toLowerCase(),
                text,
                selector: el.className ? '.' + el.className.split(' ').filter(Boolean)[0] : el.tagName.toLowerCase(),
                role: el.getAttribute('role'),
                ariaLabel: el.getAttribute('aria-label'),
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                w: Math.round(rect.width),
                h: Math.round(rect.height),
                visible: true,
                clickable: isClickable,
                interactable: isVisible && isClickable,
              });
            }
          });
          return elements;
        })()
      `),
      Promise.resolve(this.platformDetector.detect(await this.hyperion.getPageURL())),
    ]);

    const pageStateValue = pageState?.value || {};
    const url = pageStateValue.url || (await this.hyperion.getPageURL());

    return {
      id: `frame-${Date.now()}`,
      timestamp: Date.now(),
      screenshot: screenshotBuf,
      base64: screenshotBuf.toString('base64'),
      elements: elementList?.value || [],
      layers: {},
      url,
      title: pageStateValue.title || '',
      scrollX: pageStateValue.scrollX || 0,
      scrollY: pageStateValue.scrollY || 0,
      scrollHeight: pageStateValue.scrollHeight || 0,
      scrollWidth: pageStateValue.scrollWidth || 0,
      vpWidth: pageStateValue.vpWidth || 1920,
      vpHeight: pageStateValue.vpHeight || 1080,
      platform: platformInfo,
    };
  }

  /**
   * Detect DOM changes between frames
   */
  private detectChanges(
    prev: VisionFrame,
    curr: VisionFrame
  ): VisionFrame['changes'] {
    const prevMap = new Map(prev.elements.map(e => [e.id, e]));
    const currMap = new Map(curr.elements.map(e => [e.id, e]));

    const added: number[] = [];
    const removed: number[] = [];
    const modified: number[] = [];
    const repositioned: number[] = [];

    // Find added elements
    for (const [id] of currMap) {
      if (!prevMap.has(id)) added.push(id);
    }

    // Find removed elements
    for (const [id] of prevMap) {
      if (!currMap.has(id)) removed.push(id);
    }

    // Find modified elements
    for (const [id, currEl] of currMap) {
      const prevEl = prevMap.get(id);
      if (!prevEl) continue;

      const posChanged = currEl.x !== prevEl.x || currEl.y !== prevEl.y;
      const sizeChanged = currEl.w !== prevEl.w || currEl.h !== prevEl.h;
      const textChanged = currEl.text !== prevEl.text;

      if (posChanged && !sizeChanged && !textChanged) {
        repositioned.push(id);
      } else if (sizeChanged || textChanged) {
        modified.push(id);
      }
    }

    return { added, removed, modified, repositioned };
  }

  /**
   * Get latest frame
   */
  getLatestFrame(): VisionFrame | null {
    return this.lastFrame || null;
  }

  /**
   * Get frame history
   */
  getFrameHistory(count = 10): VisionFrame[] {
    return this.frameBuffer.slice(-count);
  }

  /**
   * Search frames by platform
   */
  getFramesByPlatform(platform: string): VisionFrame[] {
    return this.frameBuffer.filter(f => f.platform === platform);
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      totalFrames: this.frameBuffer.length,
      isStreaming: this.streaming,
      lastFrameAt: this.lastFrame?.timestamp || 0,
      totalElements: this.lastFrame?.elements.length || 0,
      lastPlatform: this.lastFrame?.platform || 'unknown',
    };
  }
}
