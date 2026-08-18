"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadPrimitive = void 0;
class UploadPrimitive {
    cxn;
    constructor(cxn) {
        this.cxn = cxn;
    }
    async uploadFile(selector, filePaths) {
        const files = Array.isArray(filePaths) ? filePaths : [filePaths];
        const normalizedFiles = files.map(f => f.replace(/\\/g, '/'));
        // Method 1: Direct DOM.setFileInputFiles
        try {
            const { result } = await this.cxn.call('DOM.querySelector', {
                nodeId: 1,
                selector
            });
            if (result?.nodeId) {
                await this.cxn.call('DOM.setFileInputFiles', {
                    nodeId: result.nodeId,
                    files: normalizedFiles
                });
                // Disparar change event
                await this.cxn.evaluate(`
          document.querySelector('${selector.replace(/'/g, "\\'")}')
            ?.dispatchEvent(new Event('change', {bubbles: true}))
        `);
                return;
            }
        }
        catch { }
        // Method 2: Intercept file chooser dialog
        // Para casos donde el input file se crea dinámicamente
        try {
            await this.cxn.call('Page.setInterceptFileChooserDialog', { enabled: true });
            const fileChooserOpened = new Promise((resolve, reject) => {
                const handler = async (params) => {
                    try {
                        await this.cxn.call('Page.handleFileChooser', {
                            files: normalizedFiles,
                            action: 'accept'
                        });
                        resolve();
                    }
                    catch (err) {
                        reject(err);
                    }
                };
                this.cxn.once('Page.fileChooserOpened', handler);
                setTimeout(() => reject(new Error('File chooser timeout')), 10000);
            });
            // Click on the element that opens the file chooser
            await this.cxn.call('Runtime.evaluate', {
                expression: `
          document.querySelector('${selector.replace(/'/g, "\\'")}')?.click()
        `
            });
            await fileChooserOpened;
        }
        finally {
            try {
                await this.cxn.call('Page.setInterceptFileChooserDialog', { enabled: false });
            }
            catch { }
        }
    }
}
exports.UploadPrimitive = UploadPrimitive;
//# sourceMappingURL=upload.js.map