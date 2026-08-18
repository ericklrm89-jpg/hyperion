"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotAttachedError = exports.TargetClosedError = exports.TimeoutError = exports.DEFAULT_CONFIG = void 0;
exports.DEFAULT_CONFIG = {
    mode: 'extension',
    timeout: 30000,
    stealth: {
        runtimeEnable: false,
        automationOverride: true,
        focusEmulation: true,
        zeroJSPatches: true
    },
    verbose: false
};
class TimeoutError extends Error {
    constructor(method, ms) {
        super(`CDP timeout after ${ms}ms: ${method}`);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
class TargetClosedError extends Error {
    constructor() {
        super('Target closed');
        this.name = 'TargetClosedError';
    }
}
exports.TargetClosedError = TargetClosedError;
class NotAttachedError extends Error {
    constructor() {
        super('Not attached to target');
        this.name = 'NotAttachedError';
    }
}
exports.NotAttachedError = NotAttachedError;
//# sourceMappingURL=config.js.map