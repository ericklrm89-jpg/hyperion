import { Hyperion } from '../hyperion'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

export class MCPServer {
  private server: Server
  private hyperion: Hyperion

  constructor(hyperion: Hyperion) {
    this.hyperion = hyperion
    this.server = new Server(
      {
        name: 'hyperion-browser',
        version: '0.1.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    )

    this.setupHandlers()
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'browser_navigate',
          description: 'Navigate to a URL',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL to navigate to' },
              waitUntil: { type: 'string', enum: ['load', 'networkIdle', 'DOMContentLoaded'], default: 'load' }
            },
            required: ['url']
          }
        },
        {
          name: 'browser_click',
          description: 'Click an element by CSS selector',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector' },
              button: { type: 'string', enum: ['left', 'middle', 'right'], default: 'left' },
              clickCount: { type: 'number', default: 1 }
            },
            required: ['selector']
          }
        },
        {
          name: 'browser_type',
          description: 'Type text into an element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector' },
              text: { type: 'string', description: 'Text to type' },
              clearField: { type: 'boolean', default: false, description: 'Clear field before typing' },
              humanLike: { type: 'boolean', default: true },
              pasteThreshold: { type: 'number', default: 100 }
            },
            required: ['selector', 'text']
          }
        },
        {
          name: 'browser_screenshot',
          description: 'Take a screenshot',
          inputSchema: {
            type: 'object',
            properties: {
              mode: { type: 'string', enum: ['viewport', 'fullPage', 'element'], default: 'viewport' },
              selector: { type: 'string', description: 'CSS selector (for element mode)' },
              format: { type: 'string', enum: ['png', 'jpeg', 'webp'], default: 'png' },
              quality: { type: 'number', description: 'JPEG/WebP quality 0-100' }
            }
          }
        },
        {
          name: 'browser_hover',
          description: 'Hover over an element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector' }
            },
            required: ['selector']
          }
        },
        {
          name: 'browser_scroll',
          description: 'Scroll the page or an element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector to scroll into view' },
              deltaY: { type: 'number', description: 'Pixels to scroll vertically' },
              deltaX: { type: 'number', description: 'Pixels to scroll horizontally' },
              toTop: { type: 'boolean', description: 'Scroll to top' },
              toBottom: { type: 'boolean', description: 'Scroll to bottom' }
            }
          }
        },
        {
          name: 'browser_select_option',
          description: 'Select an option in a select element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector for select element' },
              value: { type: 'string', description: 'Option value to select' }
            },
            required: ['selector', 'value']
          }
        },
        {
          name: 'browser_upload_file',
          description: 'Upload a file through a file input',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector for file input' },
              filePath: { type: 'string', description: 'Path to file to upload' }
            },
            required: ['selector', 'filePath']
          }
        },
        {
          name: 'browser_handle_dialog',
          description: 'Accept or dismiss a JavaScript dialog',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['accept', 'dismiss'], default: 'accept' },
              promptText: { type: 'string', description: 'Text for prompt dialog' }
            }
          }
        },
        {
          name: 'browser_evaluate',
          description: 'Execute JavaScript in the page',
          inputSchema: {
            type: 'object',
            properties: {
              expression: { type: 'string', description: 'JavaScript expression' }
            },
            required: ['expression']
          }
        },
        {
          name: 'browser_get_text',
          description: 'Get visible text content of the page',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'browser_get_url',
          description: 'Get current page URL',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'browser_wait',
          description: 'Wait for a fixed duration',
          inputSchema: {
            type: 'object',
            properties: {
              ms: { type: 'number', description: 'Milliseconds to wait', default: 1000 }
            }
          }
        },
        {
          name: 'browser_wait_for_selector',
          description: 'Wait for an element to appear',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector' },
              timeout: { type: 'number', default: 10000 }
            },
            required: ['selector']
          }
        },
        {
          name: 'browser_overlay_inject',
          description: 'Inject persistent overlay to map interactive elements with numbered rectangles. Kills any existing overlay first.',
          inputSchema: {
            type: 'object',
            properties: {
              intervalMs: { type: 'number', default: 2000, description: 'Refresh interval in ms' },
              includePostLinks: { type: 'boolean', default: true, description: 'Include social media post/reel links' },
              gridSize: { type: 'number', default: 200, description: 'Grid size in px for stable IDs' }
            }
          }
        },
        {
          name: 'browser_overlay_kill',
          description: 'Kill the overlay and clean up all intervals/timeouts',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'browser_overlay_get',
          description: 'Get current overlay element data (array of {sid, tag, text, x, y, w, h})',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'browser_overlay_click',
          description: 'Click an overlay element by its SID number',
          inputSchema: {
            type: 'object',
            properties: {
              sid: { type: 'number', description: 'Element SID number shown in overlay' }
            },
            required: ['sid']
          }
        },
        {
          name: 'browser_overlay_find',
          description: 'Find overlay element by text content',
          inputSchema: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Text to search for in element labels' }
            },
            required: ['text']
          }
        },
        {
          name: 'browser_layer_detect',
          description: 'Detect active UI layer (dialog, sidebar, content, bottom, unknown)',
          inputSchema: { type: 'object', properties: {} }
        }
      ]
    }))

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const name = request.params.name
      const args = request.params.arguments || {}

      try {
        switch (name) {
          case 'browser_navigate': {
            const url = args.url as string
            const waitUntil = (args.waitUntil as string) || 'load'
            await this.hyperion.navigate.navigate({ url, waitUntil: waitUntil as any })
            return { content: [{ type: 'text', text: `Navigated to ${url}` }] }
          }

          case 'browser_click': {
            const selector = args.selector as string
            const button = (args.button as string) || 'left'
            const clickCount = (args.clickCount as number) || 1
            await this.hyperion.click.click(selector, { button: button as any, clickCount })
            return { content: [{ type: 'text', text: `Clicked ${selector}` }] }
          }

          case 'browser_type': {
            const selector = args.selector as string
            const text = args.text as string
            const clearField = args.clearField as boolean || false
            const humanLike = args.humanLike !== false
            const pasteThreshold = (args.pasteThreshold as number) || 100
            await this.hyperion.type.type(selector, text, { clearField, humanLike, pasteThreshold })
            return { content: [{ type: 'text', text: `Typed into ${selector}` }] }
          }

          case 'browser_screenshot': {
            const mode = (args.mode as string) || 'viewport'
            const selector = args.selector as string | undefined
            const format = (args.format as string) || 'png'
            const quality = args.quality as number | undefined
            const buf = await this.hyperion.screenshot.capture({
              mode: mode as any,
              selector,
              format: format as any,
              quality
            })
            return {
              content: [
                { type: 'text', text: `Screenshot taken (${buf.length} bytes)` },
                { type: 'image', data: buf.toString('base64'), mimeType: `image/${format}` }
              ]
            }
          }

          case 'browser_hover': {
            const selector = args.selector as string
            await this.hyperion.click.hover(selector)
            return { content: [{ type: 'text', text: `Hovered ${selector}` }] }
          }

          case 'browser_scroll': {
            await this.hyperion.scroll.scroll({
              selector: args.selector as string | undefined,
              deltaX: args.deltaX as number | undefined,
              deltaY: args.deltaY as number | undefined,
              toTop: args.toTop as boolean | undefined,
              toBottom: args.toBottom as boolean | undefined
            })
            return { content: [{ type: 'text', text: 'Scrolled' }] }
          }

          case 'browser_select_option': {
            const selector = args.selector as string
            const value = args.value as string
            await this.hyperion.select.selectOption(selector, value)
            return { content: [{ type: 'text', text: `Selected ${value} in ${selector}` }] }
          }

          case 'browser_upload_file': {
            const selector = args.selector as string
            const filePath = args.filePath as string
            await this.hyperion.upload.uploadFile(selector, filePath)
            return { content: [{ type: 'text', text: `Uploaded ${filePath}` }] }
          }

          case 'browser_handle_dialog': {
            const action = (args.action as string) || 'accept'
            const promptText = args.promptText as string | undefined
            await this.hyperion.dialog.handleDialog(action as any, promptText)
            return { content: [{ type: 'text', text: `Dialog ${action}ed` }] }
          }

          case 'browser_evaluate': {
            const expression = args.expression as string
            const result = await this.hyperion.eval(expression)
            return { content: [{ type: 'text', text: JSON.stringify(result?.value ?? result) }] }
          }

          case 'browser_get_text': {
            const text = await this.hyperion.getPageText()
            return { content: [{ type: 'text', text }] }
          }

          case 'browser_get_url': {
            const url = await this.hyperion.getPageURL()
            return { content: [{ type: 'text', text: url }] }
          }

          case 'browser_wait': {
            const ms = (args.ms as number) || 1000
            await new Promise(r => setTimeout(r, ms))
            return { content: [{ type: 'text', text: `Waited ${ms}ms` }] }
          }

          case 'browser_wait_for_selector': {
            const selector = args.selector as string
            const timeout = (args.timeout as number) || 10000
            const found = await this.hyperion.navigate.waitForSelector(selector, timeout)
            if (found) {
              return { content: [{ type: 'text', text: `Selector ${selector} found` }] }
            }
            return { content: [{ type: 'text', text: `Selector ${selector} not found within timeout` }] }
          }

          case 'browser_overlay_inject': {
            await this.hyperion.overlay.inject({
              intervalMs: (args.intervalMs as number) || 2000,
              includePostLinks: args.includePostLinks !== false,
              gridSize: (args.gridSize as number) || 200
            })
            const data = await this.hyperion.overlay.getData()
            return {
              content: [
                { type: 'text', text: `Overlay injected. ${data.elements.length} elements mapped.` },
                { type: 'text', text: JSON.stringify(data.elements.slice(0, 50)) }
              ]
            }
          }

          case 'browser_overlay_kill': {
            await this.hyperion.overlay.kill()
            return { content: [{ type: 'text', text: 'Overlay killed and processes cleaned up' }] }
          }

          case 'browser_overlay_get': {
            const data = await this.hyperion.overlay.getData()
            return {
              content: [
                { type: 'text', text: `${data.type} - ${data.elements.length} elements` },
                { type: 'text', text: JSON.stringify(data.elements.slice(0, 100)) }
              ]
            }
          }

          case 'browser_overlay_click': {
            const sid = args.sid as number
            await this.hyperion.overlay.clickElement(sid)
            return { content: [{ type: 'text', text: `Clicked element [${sid}]` }] }
          }

          case 'browser_overlay_find': {
            const searchText = args.text as string
            const el = await this.hyperion.overlay.findElementByText(searchText)
            if (el) {
              return { content: [{ type: 'text', text: JSON.stringify(el) }] }
            }
            return { content: [{ type: 'text', text: `No element found with text "${searchText}"` }] }
          }

          case 'browser_layer_detect': {
            const layer = await this.hyperion.overlay.getActiveLayer()
            return { content: [{ type: 'text', text: JSON.stringify(layer) }] }
          }

          default:
            throw new Error(`Unknown tool: ${name}`)
        }
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${err.message}` }]
        }
      }
    })
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
  }

  async stop(): Promise<void> {
    await this.server.close()
  }
}
