import { Transport } from './transport'
import WebSocket = require('ws')
import * as http from 'http'
import { spawn, ChildProcess } from 'child_process'

export class LaunchTransport extends Transport {
  private ws: WebSocket | null = null
  private chromeProcess: ChildProcess | null = null
  private chromePath: string
  private userDataDir: string
  private port: number
  private resolvedWsUrl: string | null = null

  constructor(options: {
    chromePath?: string
    userDataDir?: string
    port?: number
  }) {
    super()
    this.port = options.port || 0
    this.chromePath = options.chromePath || this.getDefaultChromePath()
    this.userDataDir = options.userDataDir || ''
  }

  private getDefaultChromePath(): string {
    if (process.platform === 'win32') {
      return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    }
    if (process.platform === 'darwin') {
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    }
    return '/usr/bin/google-chrome'
  }

  async connect(): Promise<void> {
    const args: string[] = [
      `--remote-debugging-port=${this.port || 0}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-features=TranslateUI',
      '--disable-blink-features=AutomationControlled',
    ]

    if (this.userDataDir) {
      args.push(`--user-data-dir=${this.userDataDir}`)
    } else {
      args.push('--incognito')
    }

    this.chromeProcess = spawn(this.chromePath, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    this.chromeProcess.stderr?.on('data', (data: Buffer) => {
      this.emit('stderr', data.toString())
    })

    this.chromeProcess.on('close', (code) => {
      this.emit('disconnected', { code })
    })

    await this.discoverWsUrl()
    await this.connectWebSocket()
  }

  private async discoverWsUrl(): Promise<void> {
    const maxAttempts = 30
    const port = this.port || 0
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await new Promise<string>((resolve, reject) => {
          const req = http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
            let data = ''
            res.on('data', (chunk) => data += chunk)
            res.on('end', () => resolve(data))
          })
          req.on('error', reject)
          req.setTimeout(2000, () => { req.destroy(); reject(new Error('Timeout')) })
        })
        const info = JSON.parse(response)
        this.resolvedWsUrl = info.webSocketDebuggerUrl
        return
      } catch {
        await new Promise(r => setTimeout(r, 500))
      }
    }
    throw new Error('Failed to discover Chrome WebSocket URL')
  }

  private async connectWebSocket(): Promise<void> {
    if (!this.resolvedWsUrl) throw new Error('No WebSocket URL')
    this.ws = new WebSocket(this.resolvedWsUrl)

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
    if (this.chromeProcess) {
      this.chromeProcess.kill()
      this.chromeProcess = null
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
