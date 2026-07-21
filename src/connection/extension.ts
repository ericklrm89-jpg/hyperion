import { Transport } from './transport'

export class ExtensionTransport extends Transport {
  private process: any = null
  private connected = false

  constructor(private hostPath: string) {
    super()
  }

  async connect(): Promise<void> {
    const { spawn } = await import('child_process')
    this.process = spawn(this.hostPath, [], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    this.process.stdout.on('data', (data: Buffer) => {
      this.onMessage(data.toString())
    })

    this.process.stderr.on('data', (data: Buffer) => {
      this.emit('stderr', data.toString())
    })

    this.process.on('close', (code: number) => {
      this.connected = false
      this.emit('disconnected', { code })
    })

    this.process.on('error', (err: Error) => {
      this.emit('error', err)
    })

    this.connected = true
    this.emit('connected')
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected && this.process !== null
  }

  protected async sendRaw(payload: string): Promise<void> {
    if (!this.process?.stdin) throw new Error('Not connected')
    const msg = Buffer.from(payload, 'utf-8')
    const header = Buffer.alloc(4)
    header.writeUInt32LE(msg.length, 0)
    this.process.stdin.write(Buffer.concat([header, msg]))
  }

  protected onMessage(data: string): void {
    try {
      const msg = JSON.parse(data)
      if (msg.id) {
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
