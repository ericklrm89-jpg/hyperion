"use strict";
/**
 * Hyperion V2 - Universal MCP Server for Real Chrome Automation
 *
 * Main export file that unifies all modules:
 * - Core: Action framework, types, resilience
 * - Vision: Real-time streaming vision engine
 * - Overlay: Robust interactive element tracking
 * - Connection: Resilient transport layer with heartbeat
 * - MCP: Universal LLM server integration
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHyperionServer = createHyperionServer;
exports.createActionRegistry = createActionRegistry;
exports.createVisionEngine = createVisionEngine;
exports.createOverlayEngine = createOverlayEngine;
// Core framework
__exportStar(require("./core/types"), exports);
__exportStar(require("./core/ActionRegistry"), exports);
__exportStar(require("./core/logger"), exports);
// Connection & Resilience
__exportStar(require("./connection/resilience/HeartbeatManager"), exports);
__exportStar(require("./connection/resilience/ReconnectionManager"), exports);
__exportStar(require("./connection/resilience/ConnectionPool"), exports);
__exportStar(require("./connection/resilience/ConnectionHealthCheck"), exports);
// Vision Engine
__exportStar(require("./vision/VisionEngine"), exports);
// Tools & Integrations
__exportStar(require("./tools/facebook/postToFacebook"), exports);
// Overlay System
__exportStar(require("./overlay/OverlayEngine"), exports);
// MCP/LLM Integration
__exportStar(require("./mcp/LLMServer"), exports);
__exportStar(require("./mcp/MCPServerAdapter"), exports);
// Main Hyperion Browser Instance
__exportStar(require("./hyperion"), exports);
// Export factory functions
function createHyperionServer(hyperion, options) {
    const { LLMServer } = require('./mcp/LLMServer');
    return new LLMServer(hyperion, options);
}
function createActionRegistry() {
    const { ActionRegistry } = require('./core/ActionRegistry');
    return new ActionRegistry();
}
function createVisionEngine(hyperion, overlay) {
    const { VisionEngine } = require('./vision/VisionEngine');
    return new VisionEngine(hyperion, overlay);
}
function createOverlayEngine() {
    const { OverlayEngine } = require('./overlay/OverlayEngine');
    return new OverlayEngine();
}
//# sourceMappingURL=index.js.map