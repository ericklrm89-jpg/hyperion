"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectPrimitive = void 0;
class SelectPrimitive {
    constructor(cxn) {
        this.cxn = cxn;
    }
    async selectOption(selector, value) {
        const values = Array.isArray(value) ? value : [value];
        const escapedSelector = selector.replace(/'/g, "\\'");
        await this.cxn.evaluate(`
      (() => {
        const el = document.querySelector('${escapedSelector}');
        if (!el) throw new Error('Element not found');
        if (el.tagName !== 'SELECT') {
          // Custom select - try clicking the option directly
          const option = el.querySelector('[value="${value}"], [data-value="${value}"]');
          if (option) { option.click(); return; }
          throw new Error('Not a select element');
        }
        Array.from(el.options).forEach(opt => {
          opt.selected = ${JSON.stringify(values)}.includes(opt.value);
        });
        el.dispatchEvent(new Event('change', {bubbles: true}));
        el.dispatchEvent(new Event('input', {bubbles: true}));
      })()
    `);
    }
    async getOptions(selector) {
        const result = await this.cxn.evaluate(`
      (() => {
        const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
        if (!el || el.tagName !== 'SELECT') return [];
        return Array.from(el.options).map(opt => ({
          value: opt.value,
          text: opt.text
        }));
      })()
    `);
        return result?.value || [];
    }
}
exports.SelectPrimitive = SelectPrimitive;
//# sourceMappingURL=select.js.map