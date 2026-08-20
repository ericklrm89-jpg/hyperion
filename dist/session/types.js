"use strict";
/**
 * HYPERION SESSION MANAGEMENT SYSTEM — TYPES & CONTRACTS
 * Strict TypeScript interfaces for multi-session orchestration, CDP metrics, and workspaces.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthState = void 0;
var HealthState;
(function (HealthState) {
    HealthState["ONLINE"] = "ONLINE";
    HealthState["OFFLINE"] = "OFFLINE";
    HealthState["RECONNECTING"] = "RECONNECTING";
    HealthState["DEGRADED"] = "DEGRADED";
})(HealthState || (exports.HealthState = HealthState = {}));
//# sourceMappingURL=types.js.map