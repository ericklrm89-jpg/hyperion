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
export * from './core/errors';
export * from './core/action-registry';

// Connection & Resilience
export * from './connection/resilience/heartbeat-manager';
export * from './connection/resilience/reconnection-manager';
export * from './connection/resilience/connection-pool';

// Vision Engine
export * from './vision/vision-engine';
export * from './vision/platform-detector';

// Overlay System
export * from './overlay/overlay-engine';

// MCP/LLM Integration
export * from './mcp/llm-server';
export * from './mcp/tool-registry';

// Re-export common types for convenience
export type {
  ActionDefinition,
  ActionExecution,
  ActionAttempt,
  VisionFrame,
  OverlayElement,
  OverlayState,
  ConnectionMetrics,
  ConnectionState,
  HeartbeatMessage,
  HeartbeatAck,
  RetryPolicy,
} from './core/types';

// Export factory functions
export { createHyperionServer } from './mcp/llm-server';
export { createActionRegistry } from './core/action-registry';
export { createVisionEngine } from './vision/vision-engine';
export { createOverlayEngine } from './overlay/overlay-engine';
