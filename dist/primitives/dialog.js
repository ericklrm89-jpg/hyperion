"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DialogPrimitive = void 0;
class DialogPrimitive {
    constructor(cxn) {
        this.cxn = cxn;
    }
    async handleDialog(action, promptText) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.cxn.removeListener('Page.javascriptDialogOpening', handler);
                reject(new Error('Dialog timeout'));
            }, 30000);
            const handler = async (params) => {
                clearTimeout(timeout);
                try {
                    await this.cxn.call('Page.handleJavaScriptDialog', {
                        accept: action === 'accept',
                        promptText: promptText || params.defaultPrompt
                    });
                    resolve();
                }
                catch (err) {
                    reject(err);
                }
            };
            this.cxn.once('Page.javascriptDialogOpening', handler);
        });
    }
    async waitForDialog(action, promptText, timeout = 10000) {
        return this.handleDialog(action, promptText);
    }
}
exports.DialogPrimitive = DialogPrimitive;
//# sourceMappingURL=dialog.js.map