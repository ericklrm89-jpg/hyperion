"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionManager = void 0;
const extension_1 = require("./extension");
const launch_1 = require("./launch");
const attach_1 = require("./attach");
const domains_1 = require("../cdp/domains");
class ConnectionManager {
    transport;
    enabledDomains = new Map();
    config;
    constructor(config) {
        this.config = config;
        this.transport = this.createTransport(config.mode);
    }
    createTransport(mode) {
        switch (mode) {
            case 'extension':
                return new extension_1.ExtensionTransport(this.config.extensionId || 'hyperion-bridge');
            case 'launch': {
                const port = this.config.debugPort || 0;
                return new launch_1.LaunchTransport({
                    chromePath: this.config.chromePath,
                    userDataDir: this.config.chromeProfile,
                    port
                });
            }
            case 'attach':
                if (!this.config.websocketUrl) {
                    throw new Error('WebSocket URL required for attach mode');
                }
                return new attach_1.AttachTransport(this.config.websocketUrl);
            default:
                throw new Error(`Unknown connection mode: ${mode}`);
        }
    }
    async connect() {
        await this.transport.connect();
    }
    async disconnect() {
        await this.transport.disconnect();
    }
    async call(method, params) {
        return this.transport.call(method, params);
    }
    async enableDomain(domain) {
        if (this.enabledDomains.get(domain))
            return;
        await this.call(`${domain}.enable`);
        this.enabledDomains.set(domain, true);
    }
    async initDomains() {
        const tasks = [];
        for (const { domain, required, stealthSafe } of domains_1.DOMAIN_INIT_ORDER) {
            if (!stealthSafe && this.config.stealth.zeroJSPatches) {
                continue;
            }
            if (required) {
                tasks.push(this.enableDomain(domain).catch(() => { }));
            }
        }
        if (this.config.stealth.automationOverride) {
            tasks.push(this.call('Emulation.setAutomationOverride', { enabled: true }).catch(() => { }));
        }
        if (this.config.stealth.focusEmulation) {
            tasks.push(this.call('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => { }));
        }
        tasks.push(this.call('Page.setLifecycleEventsEnabled', { enabled: true }).catch(() => { }));
        await Promise.all(tasks);
    }
    async navigate(url) {
        return this.call('Page.navigate', { url });
    }
    async getLayoutMetrics() {
        return this.call('Page.getLayoutMetrics');
    }
    async getDocument(depth = 0) {
        return this.call('DOM.getDocument', { depth });
    }
    async querySelector(selector, nodeId) {
        return this.call('DOM.querySelector', {
            nodeId: nodeId || 1,
            selector
        });
    }
    async getBoxModel(nodeId) {
        return this.call('DOM.getBoxModel', { nodeId });
    }
    async evaluate(expression, options) {
        const resp = await this.call('Runtime.evaluate', {
            expression,
            awaitPromise: options?.awaitPromise ?? true,
            returnByValue: options?.returnByValue ?? true,
            userGesture: options?.userGesture ?? true
        });
        return resp?.result ?? null;
    }
    async callFunctionOn(functionDeclaration, options) {
        return this.call('Runtime.callFunctionOn', {
            functionDeclaration,
            objectId: options?.objectId,
            arguments: options?.arguments,
            returnByValue: options?.returnByValue ?? true
        });
    }
    async screenshot(options) {
        return this.call('Page.captureScreenshot', {
            format: options?.format || 'png',
            quality: options?.quality,
            clip: options?.clip,
            captureBeyondViewport: options?.captureBeyondViewport,
            fromSurface: options?.fromSurface ?? true
        });
    }
    async dispatchMouseEvent(params) {
        await this.call('Input.dispatchMouseEvent', params);
    }
    async dispatchKeyEvent(params) {
        await this.call('Input.dispatchKeyEvent', params);
    }
    async insertText(text) {
        await this.call('Input.insertText', { text });
    }
    on(event, listener) {
        this.transport.on(event, listener);
    }
    once(event, listener) {
        this.transport.once(event, listener);
    }
    removeListener(event, listener) {
        this.transport.removeListener(event, listener);
    }
}
exports.ConnectionManager = ConnectionManager;
//# sourceMappingURL=index.js.map