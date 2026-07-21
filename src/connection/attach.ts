import { Transport } from './transport'
import WebSocket = require('ws')

export class AttachTransport extends Transport {
  private ws: WebSocket | null = null

  constructor(private wsUrl: string) {
    super()
  }

  async connect(): Promise<void> {
    this.ws = new WebSocket(this.wsUrl)

    await new Promise<void>((resolve, reject) => {
      if (!this.ws) { reject(new Error('WebSocket not created')); return }
      this.ws.on('open', () => {
        this.emit('connected')
        resolve()
      })
      this.ws.on('error', reject)
      this.ws.on('message', (data: WebSocket.Data) => this.onMessage(data.toString()))
      this.ws.on('close', () => {
        this.rejectAll({ code: -32001, message: 'WebSocket closed' })
        this.emit('disconnected')
      })
      setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000)
    })
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  protected async sendRaw(payload: string): Promise<void> {
    if (!this.ws) throw new Error('Not connected')
    this.ws.send(payload)
  }

  protected onMessage(data: string): void {
    try {
      const msg = JSON.parse(data)
      if (msg.id != null) {
        if (msg.error) {
          this.rejectPending(msg.id, msg.error)
        } else {
          this.resolvePending(msg.id, msg)
        }
      } else if (msg.method) {
        this.emit(msg.method, msg.params)
      }
    } catch {
      this.buffer.push(data)
    }
  }
}
