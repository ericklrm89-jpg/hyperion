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
export * from './core/types';
export * from './core/ActionRegistry';
export * from './core/logger';
export * from './core/verifyWithVision';
export * from './connection/resilience/HeartbeatManager';
export * from './connection/resilience/ReconnectionManager';
export * from './connection/resilience/ConnectionPool';
export * from './connection/resilience/ConnectionHealthCheck';
export * from './vision/VisionEngine';
export * from './tools/facebook/postToFacebook';
export * from './overlay/OverlayEngine';
export * from './mcp/LLMServer';
export * from './mcp/MCPServerAdapter';
export * from './hyperion';
export type { ActionDefinition, ActionExecution, ActionAttempt, VisionFrame, OverlayState, ConnectionMetrics, Heartbeat, HeartbeatAck, RetryPolicy, HyperionError, VerifiedActionResult, } from './core/types';
export declare function createHyperionServer(hyperion: any, options?: any): any;
export declare function createActionRegistry(): any;
export declare function createVisionEngine(hyperion: any, overlay?: any): any;
export declare function createOverlayEngine(): any;
//# sourceMappingURL=index.d.ts.map