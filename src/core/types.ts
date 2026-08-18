/**
 * Core types for Hyperion V2 - Universal LLM Agent Framework
 * Provides type-safe, schema-validated actions with full tracing
 */

import { z } from 'zod';

/** Connection state enum */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  DISCONNECTING = 'disconnecting',
  ERROR = 'error',
}

/** Retry policy configuration */
export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier?: number;
  maxBackoffMs?: number;
}

/** Action definition for LLM consumption */
export interface ActionDefinition<T extends z.ZodTypeAny = any> {
  id: string;
  name: string;
  description: string;
  schema: T;
  
  // Metadata
  perception?: 'visual' | 'none';
  retry?: RetryPolicy;
  timeout?: number;
  requiresOverlay?: boolean;
  requiresVision?: boolean;
  category?: 'navigation' | 'interaction' | 'extraction' | 'visual' | 'utility';
}

/** Action execution attempt */
export interface ActionAttempt {
  attempt: number;
  startedAt: number;
  completedAt: number;
  result?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  duration: number;
}

/** Full action execution trace */
export interface ActionExecution {
  id: string;
  actionId: string;
  input: any;
  output?: any;
  
  // Lifecycle
  startedAt: number;
  completedAt?: number;
  status: 'pending' | 'executing' | 'success' | 'failed' | 'retrying' | 'timeout';
  
  // Error handling
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  
  // Attempts tracking
  attempts: ActionAttempt[];
  
  // Vision context
  screenshots?: Array<{
    timestamp: number;
    base64: string;
    phase: 'before' | 'after' | 'error' | 'intermediate';
    sizeBytes: number;
  }>;
  
  // Metadata
  duration: number;
  retried: boolean;
  retriedCount: number;
}

/** Vision frame with element detection */
export interface VisionFrame {
  id: string;
  timestamp: number;
  screenshot: Buffer;
  base64: string;
  
  // Element detection
  elements: Array<{
    id: number;
    tag: string;
    text: string;
    selector: string;
    role?: string;
    ariaLabel?: string;
    x: number;
    y: number;
    w: number;
    h: number;
    visible: boolean;
    clickable: boolean;
    interactable: boolean;
  }>;
  
  // Layer detection
  layers: {
    dialog?: { x: number; y: number; w: number; h: number; role?: string };
    sidebar?: { x: number; y: number; w: number; h: number };
    feed?: { x: number; y: number; w: number; h: number };
    modal?: { x: number; y: number; w: number; h: number };
    notification?: { x: number; y: number; w: number; h: number };
  };
  
  // DOM changes
  changes?: {
    added: number[];
    removed: number[];
    modified: number[];
    repositioned: number[];
  };
  
  // Page metadata
  url: string;
  title: string;
  scrollX: number;
  scrollY: number;
  scrollHeight: number;
  scrollWidth: number;
  vpWidth: number;
  vpHeight: number;
  
  // Platform detection
  platform?: 'instagram' | 'tiktok' | 'facebook' | 'twitter' | 'whatsapp' | 'generic';
}

/** Overlay state and management */
export interface OverlayState {
  injected: boolean;
  elementCount: number;
  lastRefreshAt: number;
  lastUpdateAt: number;
  elementMap: Map<number, {
    selector: string;
    text: string;
    role?: string;
  }>;
}

/** Connection health metrics */
export interface ConnectionMetrics {
  state: ConnectionState;
  isConnected: boolean;
  messagesSent: number;
  messagesReceived: number;
  failedMessages: number;
  averageLatencyMs: number;
  uptime: number;
  lastHeartbeatAt: number;
  reconnectAttempts: number;
  errorCount: number;
  lastErrorMessage?: string;
  lastErrorAt?: number;
}

/** Heartbeat payload */
export interface Heartbeat {
  timestamp: number;
  sequenceNumber: number;
  clientId: string;
}

/** Heartbeat response */
export interface HeartbeatAck {
  timestamp: number;
  sequenceNumber: number;
  serverTime: number;
  latencyMs: number;
}

/** Error type discriminator */
export interface HyperionError extends Error {
  code: string;
  retryable: boolean;
  details?: any;
}
