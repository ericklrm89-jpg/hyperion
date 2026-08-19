"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenshotPrimitive = void 0;
class ScreenshotPrimitive {
    constructor(cxn) {
        this.cxn = cxn;
    }
    async capture(options = {}) {
        const { format = 'png', quality, mode = 'viewport', selector, fromSurface = true, optimizeForSpeed = false } = options;
        if (mode === 'fullPage') {
            return this.captureFullPage(format, quality);
        }
        if (mode === 'element' && selector) {
            return this.captureElement(selector, format, quality);
        }
        const params = {
            format,
            fromSurface,
            optimizeForSpeed
        };
        if (format === 'jpeg' && quality !== undefined) {
            params.quality = Math.max(0, Math.min(100, quality));
        }
        if (options.clip) {
            params.clip = {
                x: Math.round(options.clip.x),
                y: Math.round(options.clip.y),
                width: Math.round(options.clip.width),
                height: Math.round(options.clip.height),
                scale: 1
            };
        }
        try {
            const result = await this.cxn.screenshot(params);
            return Buffer.from(result.data, 'base64');
        }
        catch (err) {
            throw new Error(`Screenshot failed: ${err.message}`);
        }
    }
    async captureFullPage(format, quality) {
        const dims = await this.cxn.evaluate('(function(){return JSON.stringify({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight})})()');
        if (!dims?.value)
            throw new Error('Could not get page dimensions');
        const { w, h } = JSON.parse(dims.value);
        if (w <= 0 || h <= 0)
            throw new Error('Invalid page dimensions');
        const params = {
            format,
            fromSurface: true,
            captureBeyondViewport: true,
            clip: { x: 0, y: 0, width: Math.round(w), height: Math.round(h), scale: 1 }
        };
        if (format === 'jpeg' && quality !== undefined) {
            params.quality = Math.max(0, Math.min(100, quality));
        }
        const result = await this.cxn.screenshot(params);
        return Buffer.from(result.data, 'base64');
    }
    async captureElement(selector, format, quality) {
        const escaped = selector.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const rectResult = await this.cxn.evaluate('(function(){var el=document.querySelector(\'' + escaped + '\');if(!el)return null;var r=el.getBoundingClientRect();return JSON.stringify({x:r.left+window.scrollX,y:r.top+window.scrollY,w:r.width,h:r.height})})()');
        if (!rectResult?.value)
            throw new Error('Element not found: ' + selector);
        const { x, y, w, h } = JSON.parse(rectResult.value);
        if (w <= 0 || h <= 0)
            throw new Error('Element has zero dimensions');
        const params = {
            format,
            fromSurface: true,
            clip: {
                x: Math.round(x),
                y: Math.round(y),
                width: Math.round(w),
                height: Math.round(h),
                scale: 1
            },
            optimizeForSpeed: false
        };
        if (format === 'jpeg' && quality !== undefined) {
            params.quality = Math.max(0, Math.min(100, quality));
        }
        const result = await this.cxn.screenshot(params);
        return Buffer.from(result.data, 'base64');
    }
    async compare(actual, expected, threshold = 0.1) {
        const pixelmatch = require('pixelmatch');
        const { PNG } = require('pngjs');
        const img1 = PNG.sync.read(actual);
        const img2 = PNG.sync.read(expected);
        const { width, height } = img1;
        const diff = new PNG({ width, height });
        const diffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold });
        return {
            diff: diffPixels / (width * height),
            diffPixels
        };
    }
}
exports.ScreenshotPrimitive = ScreenshotPrimitive;
//# sourceMappingURL=screenshot.js.map