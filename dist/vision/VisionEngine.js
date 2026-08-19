"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisionEngine = void 0;
const events_1 = require("events");
const logger_1 = require("../core/logger");
/**
 * Platform detection
 */
class PlatformDetector {
    detect(url) {
        if (url.includes('instagram.com'))
            return 'instagram';
        if (url.includes('tiktok.com'))
            return 'tiktok';
        if (url.includes('facebook.com'))
            return 'facebook';
        if (url.includes('twitter.com') || url.includes('x.com'))
            return 'twitter';
        if (url.includes('whatsapp.com'))
            return 'whatsapp';
        return 'generic';
    }
}
/**
 * Real-Time Vision Engine
 * Captures frames, detects changes, streams to LLM
 */
class VisionEngine extends events_1.EventEmitter {
    constructor(hyperion) {
        super();
        this.frameBuffer = [];
        this.streaming = false;
        this.platformDetector = new PlatformDetector();
        this.maxFrames = 100;
        this.hyperion = hyperion;
    }
    /**
     * Start streaming vision frames
     */
    async startStreaming(intervalMs = 1000, maxFrames = 100) {
        if (this.streaming) {
            logger_1.logger.warn('[Vision] Already streaming');
            return;
        }
        this.streaming = true;
        this.maxFrames = maxFrames;
        logger_1.logger.info(`[Vision] Started streaming (interval: ${intervalMs}ms, maxFrames: ${maxFrames})`);
        while (this.streaming) {
            try {
                const frame = await this.captureFrame();
                // Detect changes
                if (this.lastFrame) {
                    frame.changes = this.detectChanges(this.lastFrame, frame);
                    // Emit only if significant changes
                    if ((frame.changes?.added?.length || 0) > 0 ||
                        (frame.changes?.removed?.length || 0) > 0) {
                        this.emit('frame-changed', frame);
                    }
                }
                this.frameBuffer.push(frame);
                if (this.frameBuffer.length > maxFrames) {
                    this.frameBuffer.shift();
                }
                this.lastFrame = frame;
                this.emit('frame', frame);
            }
            catch (err) {
                this.emit('error', err);
            }
            await new Promise(r => setTimeout(r, intervalMs));
        }
    }
    /**
     * Stop streaming
     */
    stopStreaming() {
        this.streaming = false;
        logger_1.logger.info('[Vision] Stopped streaming');
    }
    /**
     * Capture single frame with full element detection
     */
    async captureFrame() {
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
    detectChanges(prev, curr) {
        const prevMap = new Map(prev.elements.map(e => [e.id, e]));
        const currMap = new Map(curr.elements.map(e => [e.id, e]));
        const added = [];
        const removed = [];
        const modified = [];
        const repositioned = [];
        // Find added elements
        for (const [id] of currMap) {
            if (!prevMap.has(id))
                added.push(id);
        }
        // Find removed elements
        for (const [id] of prevMap) {
            if (!currMap.has(id))
                removed.push(id);
        }
        // Find modified elements
        for (const [id, currEl] of currMap) {
            const prevEl = prevMap.get(id);
            if (!prevEl)
                continue;
            const posChanged = currEl.x !== prevEl.x || currEl.y !== prevEl.y;
            const sizeChanged = currEl.w !== prevEl.w || currEl.h !== prevEl.h;
            const textChanged = currEl.text !== prevEl.text;
            if (posChanged && !sizeChanged && !textChanged) {
                repositioned.push(id);
            }
            else if (sizeChanged || textChanged) {
                modified.push(id);
            }
        }
        return { added, removed, modified, repositioned };
    }
    /**
     * Get latest frame
     */
    getLatestFrame() {
        return this.lastFrame || null;
    }
    /**
     * Get frame history
     */
    getFrameHistory(count = 10) {
        return this.frameBuffer.slice(-count);
    }
    /**
     * Search frames by platform
     */
    getFramesByPlatform(platform) {
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
exports.VisionEngine = VisionEngine;
//# sourceMappingURL=VisionEngine.js.map