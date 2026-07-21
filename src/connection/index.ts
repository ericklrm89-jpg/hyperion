import { HyperionConfig, ConnectionMode } from '../config'
import { Transport } from './transport'
import { ExtensionTransport } from './extension'
import { LaunchTransport } from './launch'
import { AttachTransport } from './attach'
import { Domain, DOMAIN_INIT_ORDER } from '../cdp/domains'

export class ConnectionManager {
  public transport: Transport
  public enabledDomains: Map<string, boolean> = new Map()
  private config: HyperionConfig

  constructor(config: HyperionConfig) {
    this.config = config
    this.transport = this.createTransport(config.mode)
  }

  private createTransport(mode: ConnectionMode): Transport {
    switch (mode) {
      case 'extension':
        return new ExtensionTransport(this.config.extensionId || 'hyperion-bridge')
      case 'launch': {
        const port = this.config.debugPort || 0
        return new LaunchTransport({
          chromePath: this.config.chromePath,
          userDataDir: this.config.chromeProfile,
          port
        })
      }
      case 'attach':
        if (!this.config.websocketUrl) {
          throw new Error('WebSocket URL required for attach mode')
        }
        return new AttachTransport(this.config.websocketUrl)
      default:
        throw new Error(`Unknown connection mode: ${mode}`)
    }
  }

  async connect(): Promise<void> {
    await this.transport.connect()
  }

  async disconnect(): Promise<void> {
    await this.transport.disconnect()
  }

  async call<T = any>(method: string, params?: any): Promise<T> {
    return this.transport.call<T>(method, params)
  }

  async enableDomain(domain: Domain): Promise<void> {
    if (this.enabledDomains.get(domain)) return
    await this.call(`${domain}.enable`)
    this.enabledDomains.set(domain, true)
  }

  async initDomains(): Promise<void> {
    const tasks: Promise<void>[] = []

    for (const { domain, required, stealthSafe } of DOMAIN_INIT_ORDER) {
      if (!stealthSafe && this.config.stealth.zeroJSPatches) {
        continue
      }
      if (required) {
        tasks.push(this.enableDomain(domain).catch(() => {}))
      }
    }

    if (this.config.stealth.automationOverride) {
      tasks.push(this.call('Emulation.setAutomationOverride', { enabled: true }).catch(() => {}))
    }
    if (this.config.stealth.focusEmulation) {
      tasks.push(this.call('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {}))
    }
    tasks.push(this.call('Page.setLifecycleEventsEnabled', { enabled: true }).catch(() => {}))

    await Promise.all(tasks)
  }

  async navigate(url: string): Promise<{ frameId: string; loaderId?: string }> {
    return this.call('Page.navigate', { url })
  }

  async getLayoutMetrics(): Promise<{
    contentSize: { width: number; height: number }
    layoutViewport: { x: number; y: number; width: number; height: number }
  }> {
    return this.call('Page.getLayoutMetrics')
  }

  async getDocument(depth = 0): Promise<any> {
    return this.call('DOM.getDocument', { depth })
  }

  async querySelector(selector: string, nodeId?: number): Promise<any> {
    return this.call('DOM.querySelector', {
      nodeId: nodeId || 1,
      selector
    })
  }

  async getBoxModel(nodeId: number): Promise<any> {
    return this.call('DOM.getBoxModel', { nodeId })
  }

  async evaluate(expression: string, options?: {
    awaitPromise?: boolean
    returnByValue?: boolean
    userGesture?: boolean
  }): Promise<any> {
    const resp = await this.call('Runtime.evaluate', {
      expression,
      awaitPromise: options?.awaitPromise ?? true,
      returnByValue: options?.returnByValue ?? true,
      userGesture: options?.userGesture ?? true
    })
    return resp?.result ?? null
  }

  async callFunctionOn(functionDeclaration: string, options?: {
    objectId?: string
    arguments?: any[]
    returnByValue?: boolean
  }): Promise<any> {
    return this.call('Runtime.callFunctionOn', {
      functionDeclaration,
      objectId: options?.objectId,
      arguments: options?.arguments,
      returnByValue: options?.returnByValue ?? true
    })
  }

  async screenshot(options?: {
    format?: 'png' | 'jpeg' | 'webp'
    quality?: number
    clip?: { x: number; y: number; width: number; height: number; scale?: number }
    captureBeyondViewport?: boolean
    fromSurface?: boolean
  }): Promise<string> {
    return this.call('Page.captureScreenshot', {
      format: options?.format || 'png',
      quality: options?.quality,
      clip: options?.clip,
      captureBeyondViewport: options?.captureBeyondViewport,
      fromSurface: options?.fromSurface ?? true
    })
  }

  async dispatchMouseEvent(params: {
    type: 'mousePressed' | 'mouseReleased' | 'mouseMoved' | 'mouseWheel'
    x: number
    y: number
    button?: 'left' | 'middle' | 'right' | 'none'
    buttons?: number
    clickCount?: number
    modifiers?: number
    deltaX?: number
    deltaY?: number
  }): Promise<void> {
    await this.call('Input.dispatchMouseEvent', params)
  }

  async dispatchKeyEvent(params: {
    type: 'keyDown' | 'keyUp' | 'rawKeyDown' | 'char'
    key?: string
    code?: string
    text?: string
    unmodifiedText?: string
    windowsVirtualKeyCode?: number
    modifiers?: number
    autoRepeat?: boolean
    isKeypad?: boolean
    commands?: string[]
  }): Promise<void> {
    await this.call('Input.dispatchKeyEvent', params)
  }

  async insertText(text: string): Promise<void> {
    await this.call('Input.insertText', { text })
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.transport.on(event, listener)
  }

  once(event: string, listener: (...args: any[]) => void): void {
    this.transport.once(event, listener)
  }

  removeListener(event: string, listener: (...args: any[]) => void): void {
    this.transport.removeListener(event, listener)
  }
}
