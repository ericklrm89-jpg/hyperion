export type ConnectionMode = 'extension' | 'launch' | 'attach'

export interface HyperionConfig {
  mode: ConnectionMode
  chromePath?: string
  chromeProfile?: string
  debugPort?: number
  websocketUrl?: string
  extensionId?: string
  tabId?: string
  mcpPort?: number
  mcpStdio?: boolean
  timeout: number
  stealth: StealthConfig
  verbose: boolean
}

export interface StealthConfig {
  runtimeEnable: boolean
  automationOverride: boolean
  focusEmulation: boolean
  zeroJSPatches: boolean
  userAgent?: string
}

export const DEFAULT_CONFIG: HyperionConfig = {
  mode: 'extension',
  timeout: 30000,
  stealth: {
    runtimeEnable: false,
    automationOverride: true,
    focusEmulation: true,
    zeroJSPatches: true
  },
  verbose: false
}

export interface CDPResponse<T = any> {
  result?: T
  error?: CDPError
  sessionId?: string
}

export interface CDPError {
  code: number
  message: string
  data?: any
}

export class TimeoutError extends Error {
  constructor(method: string, ms: number) {
    super(`CDP timeout after ${ms}ms: ${method}`)
    this.name = 'TimeoutError'
  }
}

export class TargetClosedError extends Error {
  constructor() {
    super('Target closed')
    this.name = 'TargetClosedError'
  }
}

export class NotAttachedError extends Error {
  constructor() {
    super('Not attached to target')
    this.name = 'NotAttachedError'
  }
}
