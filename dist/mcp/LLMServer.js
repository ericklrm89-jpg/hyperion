"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMServer = exports.evaluateSchema = exports.scrollSchema = exports.waitSchema = exports.extractSchema = exports.visionStopSchema = exports.visionStartSchema = exports.overlayGetSchema = exports.overlayClickSchema = exports.overlayInjectSchema = exports.typeSchema = exports.clickSchema = exports.navigateSchema = exports.screenshotSchema = void 0;
const zod_1 = require("zod");
const ActionRegistry_1 = require("../core/ActionRegistry");
const VisionEngine_1 = require("../vision/VisionEngine");
const OverlayEngine_1 = require("../overlay/OverlayEngine");
const postToFacebook_1 = require("../tools/facebook/postToFacebook");
const postToInstagram_1 = require("../tools/instagram/postToInstagram");
const postToTikTok_1 = require("../tools/tiktok/postToTikTok");
const promptGemini_1 = require("../tools/gemini/promptGemini");
const sendGmail_1 = require("../tools/gmail/sendGmail");
const sendWhatsApp_1 = require("../tools/whatsapp/sendWhatsApp");
/**
 * LLM-Native Server Schema Definitions
 * All tools with Zod schemas for auto-documentation
 */
exports.screenshotSchema = zod_1.z.object({
    mode: zod_1.z.enum(['viewport', 'fullpage', 'element']).default('viewport').describe('Screenshot mode'),
    selector: zod_1.z.string().optional().describe('CSS selector for element mode'),
    quality: zod_1.z.number().min(1).max(100).default(80).describe('JPEG/WebP quality'),
});
exports.navigateSchema = zod_1.z.object({
    url: zod_1.z.string().url().describe('URL to navigate to'),
    waitUntil: zod_1.z.enum(['load', 'networkIdle', 'DOMContentLoaded']).default('load').describe('Wait condition'),
});
exports.clickSchema = zod_1.z.object({
    target: zod_1.z.union([
        zod_1.z.object({ overlayId: zod_1.z.number().describe('Overlay element ID [N]') }),
        zod_1.z.object({ selector: zod_1.z.string().describe('CSS selector') }),
        zod_1.z.object({ x: zod_1.z.number(), y: zod_1.z.number() }).describe('Coordinates'),
    ]).describe('Click target (overlayId, selector, or coordinates)'),
    button: zod_1.z.enum(['left', 'right', 'middle']).default('left'),
    strategy: zod_1.z.enum(['cdp-first', 'js-first', 'js-only']).default('cdp-first').describe('Click execution strategy with dual-tier fallback'),
    fastJS: zod_1.z.boolean().default(false).describe('Direct synthetic JavaScript click without mouse physics'),
});
exports.typeSchema = zod_1.z.object({
    text: zod_1.z.string().describe('Text to type'),
    target: zod_1.z.union([
        zod_1.z.object({ overlayId: zod_1.z.number() }),
        zod_1.z.object({ selector: zod_1.z.string() }),
    ]).describe('Target element'),
    clearFirst: zod_1.z.boolean().default(false).describe('Clear field before typing'),
    humanLike: zod_1.z.boolean().default(true).describe('Use human-like typing speed'),
});
exports.overlayInjectSchema = zod_1.z.object({
    refreshIntervalMs: zod_1.z.number().default(1000).describe('Refresh interval in ms'),
});
exports.overlayClickSchema = zod_1.z.object({
    overlayId: zod_1.z.number().describe('Overlay element ID to click'),
});
exports.overlayGetSchema = zod_1.z.object({}).describe('Get current overlay elements');
exports.visionStartSchema = zod_1.z.object({
    intervalMs: zod_1.z.number().default(1000).describe('Frame capture interval'),
});
exports.visionStopSchema = zod_1.z.object({}).describe('Stop vision streaming');
exports.extractSchema = zod_1.z.object({
    selector: zod_1.z.string().describe('CSS selector to extract'),
    format: zod_1.z.enum(['json', 'csv', 'markdown', 'html']).default('json'),
});
exports.waitSchema = zod_1.z.object({
    selector: zod_1.z.string().describe('CSS selector to wait for'),
    timeoutMs: zod_1.z.number().default(10000).describe('Timeout in ms'),
});
exports.scrollSchema = zod_1.z.object({
    direction: zod_1.z.enum(['up', 'down', 'left', 'right']).describe('Scroll direction'),
    amount: zod_1.z.number().default(500).describe('Pixels to scroll'),
    toElement: zod_1.z.string().optional().describe('Scroll to element selector'),
});
exports.evaluateSchema = zod_1.z.object({
    expression: zod_1.z.string().describe('JavaScript expression'),
    returnByValue: zod_1.z.boolean().default(true),
});
/**
 * LLMServer - Universal MCP Server with Zod schemas
 */
class LLMServer {
    constructor(hyperion) {
        this.hyperion = hyperion;
        this.registry = new ActionRegistry_1.ActionRegistry();
        this.vision = new VisionEngine_1.VisionEngine(hyperion);
        this.overlay = new OverlayEngine_1.OverlayEngine();
        this.registerBuiltinActions();
    }
    /**
     * Register all built-in actions
     */
    registerBuiltinActions() {
        // SCREENSHOT
        this.registry.register({
            id: 'screenshot',
            name: 'Take Screenshot',
            description: 'Capture current viewport as PNG. Returns base64-encoded image.',
            schema: exports.screenshotSchema,
            perception: 'visual',
            timeout: 5000,
            category: 'visual',
        });
        // NAVIGATE
        this.registry.register({
            id: 'navigate',
            name: 'Navigate to URL',
            description: 'Navigate browser to a URL. Waits for page to fully load.',
            schema: exports.navigateSchema,
            timeout: 30000,
            retry: { maxAttempts: 2, backoffMs: 1000 },
            category: 'navigation',
        });
        // CLICK
        this.registry.register({
            id: 'click',
            name: 'Click Element',
            description: 'Click an element by overlay ID, selector, or coordinates. Use overlay IDs [N] when visible.',
            schema: exports.clickSchema,
            perception: 'visual',
            timeout: 3000,
            retry: { maxAttempts: 3, backoffMs: 500 },
            category: 'interaction',
            requiresOverlay: false,
        });
        // TYPE
        this.registry.register({
            id: 'type',
            name: 'Type Text',
            description: 'Type text into an element. Uses human-like speed by default.',
            schema: exports.typeSchema,
            timeout: 5000,
            retry: { maxAttempts: 2, backoffMs: 1000 },
            category: 'interaction',
        });
        // OVERLAY INJECT
        this.registry.register({
            id: 'overlay-inject',
            name: 'Inject Overlay',
            description: 'Inject numbered overlay on all interactive elements [0], [1], [2], etc.',
            schema: exports.overlayInjectSchema,
            perception: 'visual',
            timeout: 5000,
            category: 'visual',
        });
        // OVERLAY GET
        this.registry.register({
            id: 'overlay-get',
            name: 'Get Overlay Elements',
            description: 'Get current overlay element mappings.',
            schema: exports.overlayGetSchema,
            perception: 'visual',
            timeout: 2000,
            category: 'visual',
        });
        // OVERLAY CLICK
        this.registry.register({
            id: 'overlay-click',
            name: 'Click Overlay Element',
            description: 'Click an element by its overlay ID number.',
            schema: exports.overlayClickSchema,
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
            schema: zod_1.z.object({}),
            timeout: 2000,
            category: 'visual',
        });
        // VISION START
        this.registry.register({
            id: 'vision-start',
            name: 'Start Vision Streaming',
            description: 'Start real-time vision stream. Continuously captures frames.',
            schema: exports.visionStartSchema,
            perception: 'visual',
            category: 'visual',
        });
        // VISION STOP
        this.registry.register({
            id: 'vision-stop',
            name: 'Stop Vision Streaming',
            description: 'Stop real-time vision stream.',
            schema: exports.visionStopSchema,
            category: 'visual',
        });
        // EXTRACT
        this.registry.register({
            id: 'extract',
            name: 'Extract Elements',
            description: 'Extract data from elements matching selector.',
            schema: exports.extractSchema,
            timeout: 5000,
            category: 'extraction',
        });
        // WAIT
        this.registry.register({
            id: 'wait',
            name: 'Wait for Element',
            description: 'Wait for element to appear in DOM.',
            schema: exports.waitSchema,
            timeout: 15000,
            category: 'utility',
        });
        // SCROLL
        this.registry.register({
            id: 'scroll',
            name: 'Scroll Page',
            description: 'Scroll page or element into view.',
            schema: exports.scrollSchema,
            timeout: 3000,
            category: 'interaction',
        });
        // EVALUATE
        this.registry.register({
            id: 'evaluate',
            name: 'Evaluate JavaScript',
            description: 'Execute JavaScript in page context.',
            schema: exports.evaluateSchema,
            timeout: 5000,
            category: 'utility',
        });
        // FACEBOOK POST
        this.registry.register(postToFacebook_1.postToFacebookAction);
        this.registry.register(postToInstagram_1.postToInstagramAction);
        this.registry.register(postToTikTok_1.postToTikTokAction);
        this.registry.register(promptGemini_1.promptGeminiAction);
        this.registry.register(sendGmail_1.sendGmailAction);
        this.registry.register(sendWhatsApp_1.sendWhatsAppAction);
    }
    /**
     * Execute action by ID
     */
    async executeAction(actionId, input) {
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
                    }
                    else if ('selector' in target) {
                        await this.hyperion.click.click(target.selector, {
                            button: validated.button,
                            strategy: validated.strategy,
                            fastJS: validated.fastJS,
                        });
                        return { clicked: true, selector: target.selector, strategy: validated.strategy, fastJS: validated.fastJS };
                    }
                    else {
                        await this.hyperion.click.clickAt(target.x, target.y, {
                            button: validated.button,
                        });
                        return { clicked: true, x: target.x, y: target.y };
                    }
                }
                case 'type': {
                    const target = validated.target;
                    if ('overlayId' in target) {
                        const elements = await this.overlay.getElements(this.hyperion);
                        const el = elements.find((e) => e.overlayId === target.overlayId);
                        if (el) {
                            await this.hyperion.type.type(el.selector, validated.text, {
                                clearField: validated.clearFirst,
                                humanLike: validated.humanLike,
                            });
                        }
                    }
                    else {
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
                    const elements = await this.hyperion.eval(`Array.from(document.querySelectorAll('${validated.selector}')).map(el => ({\n            text: el.textContent,\n            html: el.innerHTML,\n            className: el.className,\n            id: el.id,\n          }))`);
                    return {
                        format: validated.format,
                        count: elements?.value?.length || 0,
                        data: elements?.value || [],
                    };
                }
                case 'wait': {
                    const found = await this.hyperion.navigate.waitForSelector(validated.selector, validated.timeoutMs);
                    return {
                        found,
                        selector: validated.selector,
                    };
                }
                case 'scroll': {
                    if (validated.toElement) {
                        await this.hyperion.scroll.scroll({ selector: validated.toElement });
                    }
                    else {
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
                case 'facebook-post': {
                    return (0, postToFacebook_1.executePostToFacebook)(this.hyperion.cxn, validated);
                }
                case 'instagram-post': {
                    return (0, postToInstagram_1.executePostToInstagram)(this.hyperion.cxn, validated);
                }
                case 'tiktok-post': {
                    return (0, postToTikTok_1.executePostToTikTok)(this.hyperion.cxn, validated);
                }
                case 'gemini-prompt': {
                    return (0, promptGemini_1.executePromptGemini)(this.hyperion.cxn, validated);
                }
                case 'gmail-send': {
                    return (0, sendGmail_1.executeSendGmail)(this.hyperion.cxn, validated);
                }
                case 'whatsapp-send': {
                    return (0, sendWhatsApp_1.executeSendWhatsApp)(this.hyperion.cxn, validated);
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
exports.LLMServer = LLMServer;
//# sourceMappingURL=LLMServer.js.map