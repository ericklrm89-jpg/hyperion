"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CDP_ERROR_CODES = void 0;
exports.isTargetClosed = isTargetClosed;
exports.isNotAttached = isNotAttached;
exports.isRetryableError = isRetryableError;
exports.CDP_ERROR_CODES = {
    NOT_IMPLEMENTED: -32000,
    TARGET_CLOSED: -32001,
    NOT_ATTACHED: -32002,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
};
function isTargetClosed(err) {
    return err?.code === exports.CDP_ERROR_CODES.TARGET_CLOSED;
}
function isNotAttached(err) {
    return err?.code === exports.CDP_ERROR_CODES.NOT_ATTACHED;
}
function isRetryableError(err) {
    if (!err?.code)
        return false;
    return [
        exports.CDP_ERROR_CODES.TARGET_CLOSED,
        exports.CDP_ERROR_CODES.NOT_ATTACHED,
        exports.CDP_ERROR_CODES.INTERNAL_ERROR
    ].includes(err.code);
}
//# sourceMappingURL=errors.js.map