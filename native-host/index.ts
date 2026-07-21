#!/usr/bin/env node
// Native Messaging Host for Hyperion Browser
// Reads 4-byte length-prefixed JSON messages from stdin
// Writes 4-byte length-prefixed JSON responses to stdout

import * as net from 'net'
import * as http from 'http'

const PIPE_NAME = '\\\\.\\pipe\\hyperion-bridge'
const TCP_PORT = 12122

class NativeHost {
  private server: net.Server | null = null
  private clients: Set<net.Socket> = new Set()
  private extensionPort: chrome.runtime.Port | null = null

  async start(): Promise<void> {
    // Listen for TCP connections from Hyperion server
    this.server = net.createServer((socket) => {
      this.clients.add(socket)
      console.error(`Client connected (${this.clients.size} total)`)

      let buffer = Buffer.alloc(0)

      socket.on('data', (data) => {
        buffer = Buffer.concat([buffer, data])

        // Process complete messages
        while (buffer.length >= 4) {
          const msgLen = buffer.readUInt32LE(0)
          if (buffer.length < 4 + msgLen) break

          const msgStr = buffer.slice(4, 4 + msgLen).toString('utf-8')
          buffer = buffer.slice(4 + msgLen)

          try {
            const message = JSON.parse(msgStr)
            this.handleMessage(message, socket)
          } catch (err) {
            console.error('Invalid JSON:', msgStr)
          }
        }
      })

      socket.on('close', () => {
        this.clients.delete(socket)
        console.error(`Client disconnected (${this.clients.size} remaining)`)
      })

      socket.on('error', (err) => {
        console.error('Socket error:', err.message)
        this.clients.delete(socket)
      })
    })

    return new Promise((resolve) => {
      this.server!.listen(TCP_PORT, '127.0.0.1', () => {
        console.error(`Native Host listening on 127.0.0.1:${TCP_PORT}`)

        // Also listen on stdin for Native Messaging format
        this.startStdinListener()

        resolve()
      })
    })
  }

  private startStdinListener(): void {
    let stdinBuffer = Buffer.alloc(0)

    process.stdin.on('data', (data) => {
      stdinBuffer = Buffer.concat([stdinBuffer, data])

      while (stdinBuffer.length >= 4) {
        const msgLen = stdinBuffer.readUInt32LE(0)
        if (stdinBuffer.length < 4 + msgLen) break

        const msgStr = stdinBuffer.slice(4, 4 + msgLen).toString('utf-8')
        stdinBuffer = stdinBuffer.slice(4 + msgLen)

        try {
          const message = JSON.parse(msgStr)
          // Route from extension to TCP clients
          this.broadcast(message)
        } catch (err) {
          console.error('Invalid JSON from stdin:', msgStr)
        }
      }
    })

    process.stdin.on('end', () => {
      console.error('stdin closed, shutting down')
      process.exit(0)
    })
  }

  private handleMessage(message: any, socket: net.Socket): void {
    // Forward to extension via stdout (Native Messaging format)
    const msgStr = JSON.stringify(message)
    const msgBuf = Buffer.from(msgStr, 'utf-8')
    const header = Buffer.alloc(4)
    header.writeUInt32LE(msgBuf.length, 0)
    process.stdout.write(Buffer.concat([header, msgBuf]))
  }

  private broadcast(message: any): void {
    const msgStr = JSON.stringify(message)
    const msgBuf = Buffer.from(msgStr, 'utf-8')
    const header = Buffer.alloc(4)
    header.writeUInt32LE(msgBuf.length, 0)
    const packet = Buffer.concat([header, msgBuf])

    for (const client of this.clients) {
      client.write(packet)
    }
  }

  async stop(): Promise<void> {
    for (const client of this.clients) {
      client.destroy()
    }
    this.clients.clear()
    if (this.server) {
      this.server.close()
    }
  }
}

// Run if called directly
if (require.main === module) {
  const host = new NativeHost()
  host.start().catch((err) => {
    console.error('Failed to start:', err)
    process.exit(1)
  })

  process.on('SIGINT', async () => {
    await host.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    await host.stop()
    process.exit(0)
  })
}

export { NativeHost }
