import { EventEmitter } from 'events'
import { CDPResponse, CDPError, TimeoutError } from '../config'
import { isRetryableError } from '../cdp/errors'

interface PendingCall {
  resolve: (value: any) => void
  reject: (error: any) => void
  method: string
  timeout: NodeJS.Timeout
}

export abstract class Transport extends EventEmitter {
  abstract connect(): Promise<void>
  abstract disconnect(): Promise<void>
  abstract isConnected(): boolean

  private pending = new Map<number, PendingCall>()
  private msgId = 0
  protected buffer: string[] = []

  protected getNextId(): number {
    return ++this.msgId
  }

  protected registerPending(id: number, method: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new TimeoutError(method, 30000))
      }, 30000)
      this.pending.set(id, { resolve, reject, method, timeout })
    })
  }

  protected resolvePending(id: number, result: any): void {
    const pending = this.pending.get(id)
    if (pending) {
      clearTimeout(pending.timeout)
      this.pending.delete(id)
      pending.resolve(result)
    }
  }

  protected rejectPending(id: number, error: CDPError): void {
    const pending = this.pending.get(id)
    if (pending) {
      clearTimeout(pending.timeout)
      this.pending.delete(id)
      pending.reject(error)
    }
  }

  protected rejectAll(error: CDPError): void {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timeout)
      this.pending.delete(pending.method as any)
      pending.reject(error)
    }
  }

  async call<T = any>(method: string, params?: any, retries = 0): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const id = this.getNextId()
        const payload = JSON.stringify({ id, method, params: params || {} })
        const resultPromise = this.registerPending(id, method)
        await this.sendRaw(payload)
        const response = await resultPromise
        if (response.error) throw response.error
        return response.result as T
      } catch (err: any) {
        if (attempt < retries && isRetryableError(err)) {
          await new Promise(r => setTimeout(r, 100))
          continue
        }
        throw err
      }
    }
    throw new Error('Unreachable')
  }

  protected abstract sendRaw(payload: string): Promise<void>
  protected abstract onMessage(data: string): void
}
