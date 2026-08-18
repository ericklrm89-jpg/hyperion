"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NavigatePrimitive = void 0;
const events_1 = require("events");
class NavigatePrimitive {
    cxn;
    lifecycleEmitter;
    constructor(cxn) {
        this.cxn = cxn;
        this.lifecycleEmitter = new events_1.EventEmitter();
        this.setupListeners();
    }
    setupListeners() {
        this.cxn.on('Page.lifecycleEvent', (params) => {
            this.lifecycleEmitter.emit(params.name, params);
        });
        this.cxn.on('Page.loadEventFired', () => {
            this.lifecycleEmitter.emit('load', {});
        });
        this.cxn.on('Page.frameStoppedLoading', (params) => {
            this.lifecycleEmitter.emit('frameStoppedLoading', params);
        });
    }
    async navigate(options) {
        const { url, waitUntil = 'load', timeout = 30000, referrer } = options;
        if (!url) {
            // Reload current page
            return this.cxn.call('Page.reload');
        }
        // Start waiting first (race-free pattern)
        const waitPromise = this.waitForNavigation(waitUntil, timeout);
        // Navigate
        const result = await this.cxn.navigate(url);
        // Wait for load
        await waitPromise;
        // Optionally wait for stable DOM
        if (options.waitForStableDOM) {
            await this.waitForStableDOM(timeout);
        }
        return result;
    }
    async waitForNavigation(waitUntil, timeout = 30000) {
        switch (waitUntil) {
            case 'load':
                return this.waitForEvent('Page.loadEventFired', timeout);
            case 'DOMContentLoaded':
                return this.waitForLifecycleEvent('DOMContentLoaded', timeout);
            case 'networkIdle':
                return this.waitForLifecycleEvent('networkIdle', timeout);
            case 'networkAlmostIdle':
                return this.waitForLifecycleEvent('networkAlmostIdle', timeout);
        }
    }
    async waitForSelector(selector, timeout = 10000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            try {
                const result = await this.cxn.evaluate(`document.querySelector('${selector.replace(/'/g, "\\'")}') !== null`);
                if (result?.value)
                    return true;
            }
            catch { }
            await new Promise(r => setTimeout(r, 200));
        }
        return false;
    }
    async waitForText(text, timeout = 10000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            try {
                const result = await this.cxn.evaluate(`document.body?.innerText?.includes(${JSON.stringify(text)}) ?? false`);
                if (result?.value)
                    return true;
            }
            catch { }
            await new Promise(r => setTimeout(r, 200));
        }
        return false;
    }
    async waitForNetworkIdle(idleMs = 1000, timeout = 30000) {
        return new Promise((resolve, reject) => {
            let pending = 0;
            let lastActivity = Date.now();
            let checkInterval;
            const onRequest = () => { pending++; lastActivity = Date.now(); };
            const onResponse = () => { pending--; lastActivity = Date.now(); };
            const onFailed = () => { pending--; lastActivity = Date.now(); };
            this.cxn.on('Network.requestWillBeSent', onRequest);
            this.cxn.on('Network.responseReceived', onResponse);
            this.cxn.on('Network.loadingFailed', onFailed);
            checkInterval = setInterval(() => {
                if (pending <= 0 && Date.now() - lastActivity >= idleMs) {
                    cleanup();
                    resolve();
                }
            }, 200);
            const cleanup = () => {
                clearInterval(checkInterval);
                clearTimeout(timeoutId);
                this.cxn.removeListener('Network.requestWillBeSent', onRequest);
                this.cxn.removeListener('Network.responseReceived', onResponse);
                this.cxn.removeListener('Network.loadingFailed', onFailed);
            };
            const timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error('Network idle timeout'));
            }, timeout);
        });
    }
    waitForEvent(event, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.cxn.removeListener(event, handler);
                reject(new Error(`Timeout waiting for ${event}`));
            }, timeout);
            const handler = () => {
                clearTimeout(timer);
                resolve();
            };
            this.cxn.once(event, handler);
        });
    }
    waitForLifecycleEvent(name, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.lifecycleEmitter.removeListener(name, handler);
                reject(new Error(`Timeout waiting for lifecycle: ${name}`));
            }, timeout);
            const handler = () => {
                clearTimeout(timer);
                resolve();
            };
            this.lifecycleEmitter.once(name, handler);
        });
    }
    async waitForStableDOM(timeout) {
        const start = Date.now();
        let lastHTML = '';
        let stableCount = 0;
        while (Date.now() - start < timeout) {
            try {
                const result = await this.cxn.evaluate('document.body?.innerHTML.length || 0');
                const html = result?.value || 0;
                if (html === lastHTML) {
                    stableCount++;
                    if (stableCount >= 3)
                        return;
                }
                else {
                    stableCount = 0;
                }
                lastHTML = html;
            }
            catch { }
            await new Promise(r => setTimeout(r, 500));
        }
    }
}
exports.NavigatePrimitive = NavigatePrimitive;
//# sourceMappingURL=navigate.js.map