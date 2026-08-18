"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hyperion = void 0;
const connection_1 = require("./connection");
const config_1 = require("./config");
const primitives_1 = require("./primitives");
class Hyperion {
    cxn;
    click;
    type;
    screenshot;
    navigate;
    scroll;
    select;
    upload;
    dialog;
    overlay;
    config;
    constructor(config) {
        this.config = { ...config_1.DEFAULT_CONFIG, ...config };
        this.cxn = new connection_1.ConnectionManager(this.config);
        this.click = new primitives_1.ClickPrimitive(this.cxn);
        this.type = new primitives_1.TypePrimitive(this.cxn);
        this.screenshot = new primitives_1.ScreenshotPrimitive(this.cxn);
        this.navigate = new primitives_1.NavigatePrimitive(this.cxn);
        this.scroll = new primitives_1.ScrollPrimitive(this.cxn);
        this.select = new primitives_1.SelectPrimitive(this.cxn);
        this.upload = new primitives_1.UploadPrimitive(this.cxn);
        this.dialog = new primitives_1.DialogPrimitive(this.cxn);
        this.overlay = new primitives_1.OverlayPrimitive(this.cxn);
    }
    async connect() {
        await this.cxn.connect();
        await this.cxn.initDomains();
    }
    async disconnect() {
        await this.cxn.disconnect();
    }
    async eval(expression) {
        return this.cxn.evaluate(expression);
    }
    async call(method, params) {
        return this.cxn.call(method, params);
    }
    async getPageText() {
        const result = await this.cxn.evaluate('document.body?.innerText || ""');
        return result?.value || '';
    }
    async getPageTitle() {
        const result = await this.cxn.evaluate('document.title');
        return result?.value || '';
    }
    async getPageURL() {
        const result = await this.cxn.evaluate('window.location.href');
        return result?.value || '';
    }
}
exports.Hyperion = Hyperion;
//# sourceMappingURL=hyperion.js.map