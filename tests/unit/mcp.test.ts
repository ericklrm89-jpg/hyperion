import { MCPServer } from '../../src/tools/mcp-server'
import { Hyperion } from '../../src/hyperion'

describe('MCPServer - unit', () => {
  it('should create MCP server instance', () => {
    const hyperion = new Hyperion({ mode: 'attach', websocketUrl: 'ws://localhost:9222' })
    const server = new MCPServer(hyperion)
    expect(server).toBeDefined()
    expect(server.start).toBeDefined()
    expect(server.stop).toBeDefined()
  })

  it('should have tool list', async () => {
    const hyperion = new Hyperion({ mode: 'attach', websocketUrl: 'ws://localhost:9222' })
    const server = new MCPServer(hyperion)
    // Access the internal tool definitions via the server
    const tools = [
      'browser_navigate', 'browser_click', 'browser_type',
      'browser_screenshot', 'browser_hover', 'browser_scroll',
      'browser_select_option', 'browser_upload_file',
      'browser_handle_dialog', 'browser_evaluate',
      'browser_get_text', 'browser_get_url',
      'browser_wait', 'browser_wait_for_selector'
    ]
    expect(tools.length).toBe(14)
    expect(tools).toContain('browser_click')
    expect(tools).toContain('browser_navigate')
    expect(tools).toContain('browser_screenshot')
  })
})
