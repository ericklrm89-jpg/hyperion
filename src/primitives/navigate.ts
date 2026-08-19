import { ConnectionManager } from '../connection'
import { EventEmitter } from 'events'

export type WaitUntil = 'load' | 'DOMContentLoaded' | 'networkIdle' | 'networkAlmostIdle'

export interface NavigateOptions {
  url?: string
  waitUntil?: WaitUntil
  timeout?: number
  referrer?: string
  waitForStableDOM?: boolean
}

export class NavigatePrimitive {
  private lifecycleEmitter: EventEmitter

  constructor(private cxn: ConnectionManager) {
    this.lifecycleEmitter = new EventEmitter()
    this.setupListeners()
  }

  private setupListeners(): void {
    this.cxn.on('Page.lifecycleEvent', (params: any) => {
      this.lifecycleEmitter.emit(params.name, params)
    })
    this.cxn.on('Page.loadEventFired', () => {
      this.lifecycleEmitter.emit('load', {})
    })
    this.cxn.on('Page.frameStoppedLoading', (params: any) => {
      this.lifecycleEmitter.emit('frameStoppedLoading', params)
    })
  }

  async navigate(options: NavigateOptions): Promise<{ frameId: string; loaderId?: string }> {
    const {
      url,
      waitUntil = 'load',
      timeout = 30000,
      referrer
    } = options

    if (!url) {
      // Reload current page
      return this.cxn.call('Page.reload')
    }

    // Start waiting first (race-free pattern)
    const waitPromise = this.waitForNavigation(waitUntil, timeout)

    // Navigate
    const result = await this.cxn.navigate(url)

    // Wait for load
    await waitPromise

    // Optionally wait for stable DOM
    if (options.waitForStableDOM) {
      await this.waitForStableDOM(timeout)
    }

    return result
  }

  async waitForNavigation(waitUntil: WaitUntil, timeout = 30000): Promise<void> {
    switch (waitUntil) {
      case 'load':
        return this.waitForEvent('Page.loadEventFired', timeout)
      case 'DOMContentLoaded':
        return this.waitForLifecycleEvent('DOMContentLoaded', timeout)
      case 'networkIdle':
        return this.waitForLifecycleEvent('networkIdle', timeout)
      case 'networkAlmostIdle':
        return this.waitForLifecycleEvent('networkAlmostIdle', timeout)
    }
  }

  async waitForSelector(selector: string, timeout = 10000): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      try {
        const result = await this.cxn.evaluate(
          `document.querySelector('${selector.replace(/'/g, "\\'")}') !== null`
        )
        if (result?.value) return true
      } catch {}
      await new Promise(r => setTimeout(r, 200))
    }
    return false
  }

  async waitForText(text: string, timeout = 10000): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      try {
        const result = await this.cxn.evaluate(
          `document.body?.innerText?.includes(${JSON.stringify(text)}) ?? false`
        )
        if (result?.value) return true
      } catch {}
      await new Promise(r => setTimeout(r, 200))
    }
    return false
  }

  async waitForNetworkIdle(idleMs = 1000, timeout = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      let pending = 0
      let lastActivity = Date.now()

      const onRequest = () => { pending++; lastActivity = Date.now() }
      const onResponse = () => { pending--; lastActivity = Date.now() }
      const onFailed = () => { pending--; lastActivity = Date.now() }

      this.cxn.on('Network.requestWillBeSent', onRequest)
      this.cxn.on('Network.responseReceived', onResponse)
      this.cxn.on('Network.loadingFailed', onFailed)

      const cleanup = () => {
        clearInterval(checkInterval)
        clearTimeout(timeoutId)
        this.cxn.removeListener('Network.requestWillBeSent', onRequest)
        this.cxn.removeListener('Network.responseReceived', onResponse)
        this.cxn.removeListener('Network.loadingFailed', onFailed)
      }

      const checkInterval = setInterval(() => {
        if (pending <= 0 && Date.now() - lastActivity >= idleMs) {
          cleanup()
          resolve()
        }
      }, 200)

      const timeoutId = setTimeout(() => {
        cleanup()
        reject(new Error('Network idle timeout'))
      }, timeout)
    })
  }

  private waitForEvent(event: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.cxn.removeListener(event, handler)
        reject(new Error(`Timeout waiting for ${event}`))
      }, timeout)

      const handler = () => {
        clearTimeout(timer)
        resolve()
      }

      this.cxn.once(event, handler)
    })
  }

  private waitForLifecycleEvent(name: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.lifecycleEmitter.removeListener(name, handler)
        reject(new Error(`Timeout waiting for lifecycle: ${name}`))
      }, timeout)

      const handler = () => {
        clearTimeout(timer)
        resolve()
      }

      this.lifecycleEmitter.once(name, handler)
    })
  }

  private async waitForStableDOM(timeout: number): Promise<void> {
    const start = Date.now()
    let lastHTML = ''
    let stableCount = 0

    while (Date.now() - start < timeout) {
      try {
        const result = await this.cxn.evaluate('document.body?.innerHTML.length || 0')
        const html = result?.value || 0

        if (html === lastHTML) {
          stableCount++
          if (stableCount >= 3) return
        } else {
          stableCount = 0
        }

        lastHTML = html
      } catch {}
      await new Promise(r => setTimeout(r, 500))
    }
  }
}
