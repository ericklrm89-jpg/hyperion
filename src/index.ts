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

// Core framework
export * from './core/types';
export * from './core/ActionRegistry';
export * from './core/logger';
export * from './core/verifyWithVision';

// Connection & Resilience
export * from './connection/resilience/HeartbeatManager';
export * from './connection/resilience/ReconnectionManager';
export * from './connection/resilience/ConnectionPool';
export * from './connection/resilience/ConnectionHealthCheck';

// Vision Engine
export * from './vision/VisionEngine';

// Tools & Integrations
export * from './tools/facebook/postToFacebook';

// Overlay System
export * from './overlay/OverlayEngine';

// MCP/LLM Integration
export * from './mcp/LLMServer';
export * from './mcp/MCPServerAdapter';

// Main Hyperion Browser Instance
export * from './hyperion';

// Re-export common types for convenience
export type {
  ActionDefinition,
  ActionExecution,
  ActionAttempt,
  VisionFrame,
  OverlayState,
  ConnectionMetrics,
  Heartbeat,
  HeartbeatAck,
  RetryPolicy,
  HyperionError,
  VerifiedActionResult,
} from './core/types';

// Export factory functions
export function createHyperionServer(hyperion: any, options?: any) {
  const { LLMServer } = require('./mcp/LLMServer');
  return new LLMServer(hyperion, options);
}

export function createActionRegistry() {
  const { ActionRegistry } = require('./core/ActionRegistry');
  return new ActionRegistry();
}

export function createVisionEngine(hyperion: any, overlay?: any) {
  const { VisionEngine } = require('./vision/VisionEngine');
  return new VisionEngine(hyperion, overlay);
}

export function createOverlayEngine() {
  const { OverlayEngine } = require('./overlay/OverlayEngine');
  return new OverlayEngine();
}
