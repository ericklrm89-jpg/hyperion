#!/usr/bin/env node
"use strict";
/**
 * Hyperion V2 CLI Entry Point
 * Supports multiple modes: MCP, CLI, Interactive
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const hyperion_1 = require("./hyperion");
const LLMServer_1 = require("./mcp/LLMServer");
const MCPServerAdapter_1 = require("./mcp/MCPServerAdapter");
const logger_1 = require("./core/logger");
/**
 * Parse CLI arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        mode: 'extension',
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
function showHelp() {
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
        const hyperion = new hyperion_1.Hyperion({
            mode: cliArgs.mode,
            debugPort: cliArgs.debugPort,
            chromePath: cliArgs.chromePath,
            chromeProfile: cliArgs.chromeProfile,
            websocketUrl: cliArgs.websocketUrl,
            verbose: cliArgs.verbose,
        });
        logger_1.logger.info({ mode: cliArgs.mode }, `[Hyperion V2] Connecting (mode: ${cliArgs.mode})...`);
        await hyperion.connect();
        logger_1.logger.info('[Hyperion V2] Connected');
        if (cliArgs.mcpMode) {
            // MCP Server mode
            const llmServer = new LLMServer_1.LLMServer(hyperion);
            const mcpAdapter = new MCPServerAdapter_1.MCPServerAdapter(llmServer);
            await mcpAdapter.start();
            logger_1.logger.info('[Hyperion V2] MCP Server started on stdio');
            // Keep alive
            process.on('SIGINT', async () => {
                logger_1.logger.info('[Hyperion V2] Shutting down...');
                await mcpAdapter.stop();
                await hyperion.disconnect();
                process.exit(0);
            });
            // Don't exit
            await new Promise(() => { });
        }
        else {
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
                rl.question('> ', async (input) => {
                    if (input === 'exit') {
                        rl.close();
                        await hyperion.disconnect();
                        process.exit(0);
                    }
                    try {
                        const [cmd, ...rest] = input.split(' ');
                        await handleCLICommand(hyperion, cmd, rest);
                    }
                    catch (err) {
                        console.error('Error:', err.message);
                    }
                    prompt();
                });
            };
            prompt();
        }
    }
    catch (err) {
        logger_1.logger.error({ err: err.message, stack: err.stack }, '[Hyperion V2] Fatal error');
        process.exit(1);
    }
}
/**
 * Handle CLI commands
 */
async function handleCLICommand(hyperion, cmd, args) {
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
                mode: args[0] || 'viewport',
            });
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
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
//# sourceMappingURL=cli.js.map