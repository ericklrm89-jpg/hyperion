#!/usr/bin/env node
export { Hyperion } from './hyperion'
export { MCPServer } from './tools/mcp-server'
export { ConnectionManager } from './connection'
export { ConnectionMode, HyperionConfig } from './config'

// CLI entry point
if (require.main === module) {
  require('./cli')
}
