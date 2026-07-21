#!/usr/bin/env node
import { Hyperion } from './hyperion'
import { MCPServer } from './tools/mcp-server'
import { ConnectionMode } from './config'

async function main() {
  const args = process.argv.slice(2)

  const config: any = {}

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--launch':
        config.mode = 'launch' as ConnectionMode
        break
      case '--attach':
        config.mode = 'attach' as ConnectionMode
        config.websocketUrl = args[++i]
        break
      case '--extension':
        config.mode = 'extension' as ConnectionMode
        break
      case '--mcp':
        config.mcpStdio = true
        break
      case '--port':
        config.debugPort = parseInt(args[++i])
        break
      case '--profile':
        config.chromeProfile = args[++i]
        break
      case '--verbose':
        config.verbose = true
        break
      case '--help':
        showHelp()
        return
    }
  }

  const hyperion = new Hyperion(config)

  try {
    await hyperion.connect()

    if (config.mcpStdio || args.includes('--mcp')) {
      // MCP mode: listen on stdio
      const mcpServer = new MCPServer(hyperion)
      await mcpServer.start()
      console.error('Hyperion MCP server started on stdio')
    } else {
      // CLI mode: execute commands
      await handleCLI(hyperion, args)
    }

    // Keep alive for MCP mode
    if (config.mcpStdio || args.includes('--mcp')) {
      process.on('SIGINT', async () => {
        await hyperion.disconnect()
        process.exit(0)
      })
      // Don't exit
      await new Promise(() => {})
    } else {
      await hyperion.disconnect()
    }
  } catch (err: any) {
    console.error('Hyperion error:', err.message)
    process.exit(1)
  }
}

async function handleCLI(hyperion: Hyperion, args: string[]): Promise<void> {
  if (args.length === 0) {
    // Default: start interactive
    console.log('Hyperion Browser - Connected')
    console.log('Available commands: navigate, click, type, screenshot, eval, text, url, scroll')
    console.log('Example: navigate https://example.com')
    return
  }

  const cmd = args[0]
  const rest = args.slice(1)

  switch (cmd) {
    case 'navigate':
      await hyperion.navigate.navigate({ url: rest[0] })
      console.log(`Navigated to ${rest[0]}`)
      break
    case 'click':
      await hyperion.click.click(rest[0])
      console.log(`Clicked ${rest[0]}`)
      break
    case 'type':
      await hyperion.type.type(rest[0], rest.slice(1).join(' '))
      console.log(`Typed into ${rest[0]}`)
      break
    case 'screenshot': {
      const buf = await hyperion.screenshot.capture({ mode: (rest[0] as any) || 'viewport' })
      const fs = await import('fs')
      const filename = `screenshot-${Date.now()}.png`
      fs.writeFileSync(filename, buf)
      console.log(`Screenshot saved: ${filename} (${buf.length} bytes)`)
      break
    }
    case 'eval':
      console.log(await hyperion.eval(rest.join(' ')))
      break
    case 'text':
      console.log(await hyperion.getPageText())
      break
    case 'url':
      console.log(await hyperion.getPageURL())
      break
    case 'scroll':
      await hyperion.scroll.scroll({ deltaY: parseInt(rest[0]) || 500 })
      console.log('Scrolled')
      break
    default:
      console.log(`Unknown command: ${cmd}`)
      showHelp()
  }
}

function showHelp(): void {
  console.log(`
Hyperion Browser - Chrome automation for AI agents

USAGE:
  hyperion [--mcp] [--launch | --attach <url> | --extension]

MODES:
  --mcp          Run as MCP server (for Cursor, Claude Code, OpenCode, etc.)
  --launch       Launch a fresh Chrome instance
  --attach <url> Attach to existing Chrome via WebSocket URL
  --extension    Connect via Chrome Extension + Native Messaging (default)

CLI COMMANDS:
  navigate <url>    Navigate to URL
  click <selector>  Click an element
  type <sel> <txt>  Type text into an element
  screenshot [mode] Take screenshot (viewport, fullPage, element)
  eval <js>         Execute JavaScript
  text              Get page text
  url               Get current URL
  scroll [pixels]   Scroll page

EXAMPLES:
  hyperion --mcp                           # Start MCP server
  hyperion navigate https://example.com    # CLI navigation
  hyperion --launch click "#submit"        # Launch + click
  hyperion --attach ws://localhost:9222/... # Attach to running Chrome
`)
}

main().catch(console.error)
