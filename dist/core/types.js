"use strict";
/**
 * Core types for Hyperion V2 - Universal LLM Agent Framework
 * Provides type-safe, schema-validated actions with full tracing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionState = void 0;
/** Connection state enum */
var ConnectionState;
(function (ConnectionState) {
    ConnectionState["DISCONNECTED"] = "disconnected";
    ConnectionState["CONNECTING"] = "connecting";
    ConnectionState["CONNECTED"] = "connected";
    ConnectionState["RECONNECTING"] = "reconnecting";
    ConnectionState["DISCONNECTING"] = "disconnecting";
    ConnectionState["ERROR"] = "error";
})(ConnectionState || (exports.ConnectionState = ConnectionState = {}));
//# sourceMappingURL=types.js.map