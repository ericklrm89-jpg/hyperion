#!/usr/bin/env node
/**
 * Hyperion V2 CLI Entry Point
 * Supports multiple modes: MCP, CLI, Interactive
 */

import { Hyperion } from './hyperion';
import { LLMServer } from './mcp/LLMServer';
import { MCPServerAdapter } from './mcp/MCPServerAdapter';
import { ConnectionMode } from './config';
import { logger } from './core/logger';

interface CLIArgs {
  mode: ConnectionMode;
  mcpMode: boolean;
  debugPort?: number;
  chromePath?: string;
  chromeProfile?: string;
  websocketUrl?: string;
  verbose?: boolean;
}

/**
 * Parse CLI arguments
 */
function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const config: any = {
    mode: 'extension' as ConnectionMode,
    mcpMode: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--mcp':
        config.mcpMode = true;
        break;
      case '--launch':
        config.mode = 'launch';
        break;
      case '--attach':
        config.mode = 'attach';
        config.websocketUrl = args[++i];
        break;
      case '--extension':
        config.mode = 'extension';
        break;
      case '--port':
        config.debugPort = parseInt(args[++i]);
        break;
      case '--profile':
        config.chromeProfile = args[++i];
        break;
      case '--chrome':
        config.chromePath = args[++i];
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--help':
        showHelp();
        process.exit(0);
    }
  }

  return config;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Hyperion V2 - LLM-Native Browser Automation

USAGE:
  hyperion [options] [mode]

MODES:
  --mcp              Run as MCP server (for Claude, Cursor, etc.)
  --launch           Launch fresh Chrome instance
  --attach <url>     Attach to existing Chrome (via WebSocket URL)
  --extension        Connect via Chrome Extension (default)

OPTIONS:
  --port <num>       Debug port for launched Chrome
  --profile <path>   Chrome user data directory
  --chrome <path>    Path to Chrome executable
  --verbose          Verbose logging
  --help             Show this help

EXAMPLES:
  # Run as MCP server
  hyperion --mcp

  # Launch fresh Chrome and run MCP
  hyperion --mcp --launch --port 9222

  # Attach to existing Chrome
  hyperion --mcp --attach ws://localhost:9222/devtools/page/xxx

  # Run with extension (default)
  hyperion --mcp --extension
  `);
}

/**
 * Main entry point
 */
async function main() {
  const cliArgs = parseArgs();

  try {
    // Create Hyperion instance
    const hyperion = new Hyperion({
      mode: cliArgs.mode,
      debugPort: cliArgs.debugPort,
      chromePath: cliArgs.chromePath,
      chromeProfile: cliArgs.chromeProfile,
      websocketUrl: cliArgs.websocketUrl,
      verbose: cliArgs.verbose,
    });

    logger.info({ mode: cliArgs.mode }, `[Hyperion V2] Connecting (mode: ${cliArgs.mode})...`);
    await hyperion.connect();
    logger.info('[Hyperion V2] Connected');

    if (cliArgs.mcpMode) {
      // MCP Server mode
      const llmServer = new LLMServer(hyperion);
      const mcpAdapter = new MCPServerAdapter(llmServer);
      await mcpAdapter.start();
      logger.info('[Hyperion V2] MCP Server started on stdio');

      // Keep alive
      process.on('SIGINT', async () => {
        logger.info('[Hyperion V2] Shutting down...');
        await mcpAdapter.stop();
        await hyperion.disconnect();
        process.exit(0);
      });

      // Don't exit
      await new Promise(() => {});
    } else {
      // Interactive CLI mode
      console.log('[Hyperion V2] Connected. Ready for commands.');
      console.log('Commands: navigate, click, type, screenshot, eval, text, url, scroll');
      console.log('Type exit to quit\n');

      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const prompt = () => {
        rl.question('> ', async (input: string) => {
          if (input === 'exit') {
            rl.close();
            await hyperion.disconnect();
            process.exit(0);
          }

          try {
            const [cmd, ...rest] = input.split(' ');
            await handleCLICommand(hyperion, cmd, rest);
          } catch (err: any) {
            console.error('Error:', err.message);
          }

          prompt();
        });
      };

      prompt();
    }
  } catch (err: any) {
    logger.error({ err: err.message, stack: err.stack }, '[Hyperion V2] Fatal error');
    process.exit(1);
  }
}

/**
 * Handle CLI commands
 */
async function handleCLICommand(
  hyperion: Hyperion,
  cmd: string,
  args: string[]
): Promise<void> {
  switch (cmd) {
    case 'navigate':
      await hyperion.navigate.navigate({ url: args[0] });
      console.log(`Navigated to ${args[0]}`);
      break;

    case 'click':
      await hyperion.click.click(args[0]);
      console.log(`Clicked ${args[0]}`);
      break;

    case 'type':
      await hyperion.type.type(args[0], args.slice(1).join(' '));
      console.log(`Typed into ${args[0]}`);
      break;

    case 'screenshot': {
      const buf = await hyperion.screenshot.capture({
        mode: (args[0] as any) || 'viewport',
      });
      const fs = await import('fs');
      const filename = `screenshot-${Date.now()}.png`;
      fs.writeFileSync(filename, buf);
      console.log(`Screenshot saved: ${filename} (${buf.length} bytes)`);
      break;
    }

    case 'eval':
      console.log(await hyperion.eval(args.join(' ')));
      break;

    case 'text':
      console.log(await hyperion.getPageText());
      break;

    case 'url':
      console.log(await hyperion.getPageURL());
      break;

    case 'scroll':
      await hyperion.scroll.scroll({ deltaY: parseInt(args[0]) || 500 });
      console.log('Scrolled');
      break;

    default:
      console.log(`Unknown command: ${cmd}`);
      console.log('Available: navigate, click, type, screenshot, eval, text, url, scroll');
  }
}

// Run
main().catch(console.error);
