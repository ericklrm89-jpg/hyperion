"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypePrimitive = void 0;
class TypePrimitive {
    cxn;
    constructor(cxn) {
        this.cxn = cxn;
    }
    async type(selector, text, options = {}) {
        const { humanLike = true, pasteThreshold = 100, errorRate = 0.03, delayMin = 30, delayMax = 120, clearField = false } = options;
        // 1. Focus the element
        await this.focusElement(selector);
        await new Promise(r => setTimeout(r, 100));
        // 2. Clear field if requested
        if (clearField) {
            await this.clearField(selector);
            await new Promise(r => setTimeout(r, 100));
        }
        // 3. Detect input type
        const inputType = await this.detectInputType(selector);
        // 4. Choose strategy
        if (inputType === 'codemirror') {
            await this.typeCodeMirror(selector, text);
            return;
        }
        // 5. Fast path: use paste for long text or single insertText call
        if (text.length > pasteThreshold) {
            await this.pasteText(text);
            return;
        }
        if (!humanLike) {
            // Fast path: single CDP call
            await this.cxn.insertText(text);
            return;
        }
        // 6. Human-like typing
        await this.humanLikeType(text, { delayMin, delayMax, errorRate });
    }
    async detectInputType(selector) {
        const result = await this.cxn.evaluate(`
      (() => {
        const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
        if (!el) return 'unknown';
        const tag = el.tagName;
        const type = el.getAttribute?.('type');
        const role = el.getAttribute?.('role');
        const ce = el.getAttribute?.('contenteditable');

        if (tag === 'INPUT') return 'input';
        if (tag === 'TEXTAREA') return 'textarea';
        if (ce === 'true' || ce === '') return 'contenteditable';
        if (role === 'textbox') return 'role-textbox';
        if (tag === 'SELECT') return 'select';

        // CodeMirror detection
        if (document.querySelector('.CodeMirror, .monaco-editor')) return 'codemirror';
        return 'unknown';
      })()
    `);
        return result?.value || 'unknown';
    }
    async focusElement(selector) {
        await this.cxn.evaluate(`
      (() => {
        const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
        if (!el) return;
        el.focus();
        if (document.activeElement !== el) {
          el.focus({preventScroll: true});
        }
        // For contenteditable: place cursor at end
        if (el.isContentEditable || el.tagName === 'DIV' || el.tagName === 'SPAN') {
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(el);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        // Dispatch focus event
        el.dispatchEvent(new FocusEvent('focus', {bubbles: true}));
      })()
    `);
    }
    async clearField(selector) {
        await this.cxn.evaluate(`
      (() => {
        const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
        if (!el) return;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.value = '';
        } else {
          el.textContent = '';
          el.innerHTML = '';
        }
        el.dispatchEvent(new Event('input', {bubbles: true}));
        el.dispatchEvent(new Event('change', {bubbles: true}));
      })()
    `);
    }
    async humanLikeType(text, opts) {
        for (const char of text) {
            // Error simulation
            if (Math.random() < opts.errorRate) {
                const wrongChar = this.pickRandomChar(char);
                await this.typeChar(wrongChar);
                await this.randomDelay(100, 300);
                await this.pressBackspace();
                await this.randomDelay(50, 150);
            }
            await this.typeChar(char);
            // Pause after spaces (word boundary)
            if (char === ' ') {
                await this.randomDelay(100, 250);
            }
            else {
                await this.randomDelay(opts.delayMin, opts.delayMax);
            }
        }
    }
    async typeChar(char) {
        if (char === '\n' || char === '\r') {
            await this.cxn.dispatchKeyEvent({ type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
            await this.cxn.dispatchKeyEvent({ type: 'char', text: '\r', key: 'Enter', windowsVirtualKeyCode: 13 });
            await this.cxn.dispatchKeyEvent({ type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
            return;
        }
        if (char === '\t') {
            await this.cxn.dispatchKeyEvent({ type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
            await this.cxn.dispatchKeyEvent({ type: 'char', text: '\t', key: 'Tab', windowsVirtualKeyCode: 9 });
            await this.cxn.dispatchKeyEvent({ type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
            return;
        }
        const keyDef = this.getKeyDefinition(char);
        await this.cxn.dispatchKeyEvent({
            type: 'rawKeyDown',
            key: keyDef.key,
            code: keyDef.code,
            text: keyDef.shift ? '' : char,
            unmodifiedText: keyDef.shift ? '' : char,
            windowsVirtualKeyCode: keyDef.keyCode,
            modifiers: keyDef.shift ? 8 : 0
        });
        await this.cxn.dispatchKeyEvent({
            type: 'char',
            key: char,
            text: char,
            windowsVirtualKeyCode: keyDef.keyCode,
            modifiers: keyDef.shift ? 8 : 0
        });
        await this.cxn.dispatchKeyEvent({
            type: 'keyUp',
            key: keyDef.key,
            code: keyDef.code,
            windowsVirtualKeyCode: keyDef.keyCode,
            modifiers: keyDef.shift ? 8 : 0
        });
    }
    async pasteText(text) {
        // Method 1: Input.insertText (works for contenteditable, IME)
        try {
            await this.cxn.insertText(text);
            return;
        }
        catch { }
        // Method 2: Runtime.evaluate with clipboard API
        try {
            await this.cxn.evaluate(`navigator.clipboard.writeText(${JSON.stringify(text)})`);
            const modifiers = process.platform === 'darwin' ? 4 : 2;
            await this.cxn.dispatchKeyEvent({ type: 'rawKeyDown', modifiers, key: 'Control', code: 'ControlLeft', windowsVirtualKeyCode: 17 });
            await this.cxn.dispatchKeyEvent({ type: 'rawKeyDown', modifiers, key: 'v', code: 'KeyV', windowsVirtualKeyCode: 86, text: 'v', unmodifiedText: 'v' });
            await this.cxn.dispatchKeyEvent({ type: 'char', text: 'v', key: 'v' });
            await this.cxn.dispatchKeyEvent({ type: 'keyUp', modifiers, key: 'v', code: 'KeyV', windowsVirtualKeyCode: 86 });
            await this.cxn.dispatchKeyEvent({ type: 'keyUp', key: 'Control', code: 'ControlLeft', windowsVirtualKeyCode: 17 });
            return;
        }
        catch { }
        // Method 3: execCommand fallback
        await this.cxn.evaluate(`document.execCommand('insertText', false, ${JSON.stringify(text)})`);
    }
    async pressBackspace() {
        await this.cxn.dispatchKeyEvent({ type: 'rawKeyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
        await this.cxn.dispatchKeyEvent({ type: 'char', text: '\b', key: 'Backspace', windowsVirtualKeyCode: 8 });
        await this.cxn.dispatchKeyEvent({ type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
    }
    async typeCodeMirror(selector, text) {
        // CodeMirror / Monaco: usar API interna
        await this.cxn.evaluate(`
      (() => {
        const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
        if (!el) return;
        // CodeMirror
        const cm = el.CodeMirror || document.querySelector('.CodeMirror')?.CodeMirror;
        if (cm) { cm.setValue(${JSON.stringify(text)}); return; }
        // Monaco
        const monaco = window.monaco?.editor?.getModels?.()?.[0];
        if (monaco) { monaco.setValue(${JSON.stringify(text)}); return; }
      })()
    `);
    }
    getKeyDefinition(char) {
        const upper = char.toUpperCase();
        const isLetter = /[a-zA-Z]/.test(char);
        const isDigit = /[0-9]/.test(char);
        const isUpper = char === upper && isLetter;
        if (isLetter) {
            return {
                key: isUpper ? char : char.toLowerCase(),
                code: `Key${upper}`,
                keyCode: upper.charCodeAt(0),
                shift: isUpper
            };
        }
        if (isDigit) {
            return {
                key: char,
                code: `Digit${char}`,
                keyCode: 48 + parseInt(char),
                shift: false
            };
        }
        const specials = {
            ' ': { key: ' ', code: 'Space', keyCode: 32, shift: false },
            '.': { key: '.', code: 'Period', keyCode: 190, shift: false },
            ',': { key: ',', code: 'Comma', keyCode: 188, shift: false },
            '-': { key: '-', code: 'Minus', keyCode: 189, shift: false },
            '=': { key: '=', code: 'Equal', keyCode: 187, shift: false },
            '/': { key: '/', code: 'Slash', keyCode: 191, shift: false },
            '\\': { key: '\\', code: 'Backslash', keyCode: 220, shift: false },
            ';': { key: ';', code: 'Semicolon', keyCode: 186, shift: false },
            "'": { key: "'", code: 'Quote', keyCode: 222, shift: false },
            '[': { key: '[', code: 'BracketLeft', keyCode: 219, shift: false },
            ']': { key: ']', code: 'BracketRight', keyCode: 221, shift: false },
            '`': { key: '`', code: 'Backquote', keyCode: 192, shift: false },
            '!': { key: '!', code: 'Digit1', keyCode: 49, shift: true },
            '@': { key: '@', code: 'Digit2', keyCode: 50, shift: true },
            '#': { key: '#', code: 'Digit3', keyCode: 51, shift: true },
            '$': { key: '$', code: 'Digit4', keyCode: 52, shift: true },
            '%': { key: '%', code: 'Digit5', keyCode: 53, shift: true },
            '^': { key: '^', code: 'Digit6', keyCode: 54, shift: true },
            '&': { key: '&', code: 'Digit7', keyCode: 55, shift: true },
            '*': { key: '*', code: 'Digit8', keyCode: 56, shift: true },
            '(': { key: '(', code: 'Digit9', keyCode: 57, shift: true },
            ')': { key: ')', code: 'Digit0', keyCode: 48, shift: true },
            '_': { key: '_', code: 'Minus', keyCode: 189, shift: true },
            '+': { key: '+', code: 'Equal', keyCode: 187, shift: true },
            '{': { key: '{', code: 'BracketLeft', keyCode: 219, shift: true },
            '}': { key: '}', code: 'BracketRight', keyCode: 221, shift: true },
            '|': { key: '|', code: 'Backslash', keyCode: 220, shift: true },
            ':': { key: ':', code: 'Semicolon', keyCode: 186, shift: true },
            '"': { key: '"', code: 'Quote', keyCode: 222, shift: true },
            '<': { key: '<', code: 'Comma', keyCode: 188, shift: true },
            '>': { key: '>', code: 'Period', keyCode: 190, shift: true },
            '?': { key: '?', code: 'Slash', keyCode: 191, shift: true },
            '~': { key: '~', code: 'Backquote', keyCode: 192, shift: true },
        };
        return specials[char] || { key: char, code: '', keyCode: char.charCodeAt(0), shift: false };
    }
    pickRandomChar(char) {
        const nearby = {
            'a': ['s', 'w', 'q'],
            'e': ['r', 'w', 'd'],
            'i': ['o', 'u', 'k'],
            'o': ['p', 'i', 'l'],
            'u': ['i', 'y', 'j'],
            'n': ['m', 'b'],
            's': ['d', 'a', 'w'],
            't': ['y', 'r', 'g'],
            'm': ['n', ','],
            ' ': [' '],
        };
        const options = nearby[char.toLowerCase()];
        if (options)
            return options[Math.floor(Math.random() * options.length)];
        return String.fromCharCode(char.charCodeAt(0) + (Math.random() > 0.5 ? 1 : -1));
    }
    async randomDelay(min, max) {
        const delay = min + Math.random() * (max - min);
        return new Promise(r => setTimeout(r, delay));
    }
}
exports.TypePrimitive = TypePrimitive;
//# sourceMappingURL=type.js.map