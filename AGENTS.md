# Hyperion Browser - AI Agent Guide

## What is Hyperion?

Hyperion is a **universal MCP server** that lets any AI agent control a real Chrome browser.
It is NOT a Cursor extension, NOT a VS Code plugin, NOT a Claude-only tool.
Any agent that speaks MCP (Model Context Protocol) or CLI can use it.

## How Agents Can Use Hyperion

### Cursor (VS Code)
Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "hyperion": {
      "command": "npx",
      "args": ["hyperion-browser", "--mcp"]
    }
  }
}
```

### Claude Code (CLI)
```bash
claude code --mcp-servers '{"hyperion": {"command": "hyperion", "args": ["--mcp"]}}'
```

### OpenCode
Already using MCP-compatible tools. Add to `opencode.json` MCP servers.

### Hermes Agent
Configure as Browser SubAgent:
```json
{
  "browser": {
    "provider": "mcp",
    "server": "hyperion",
    "args": ["--mcp"]
  }
}
```

### AGY
Configure as Browser MCP Tool:
```yaml
mcp_servers:
  hyperion:
    command: hyperion
    args: ["--mcp"]
```

### Any MCP client
```bash
hyperion --mcp
```

## Available Tools

| Tool | Description |
|------|-------------|
| `browser_navigate` | Navigate to URL |
| `browser_click` | Click element by CSS selector |
| `browser_type` | Type text into element (human-like or fast) |
| `browser_screenshot` | Screenshot (viewport, full-page, element) |
| `browser_hover` | Hover over element |
| `browser_scroll` | Scroll page or element |
| `browser_select_option` | Select option in `<select>` |
| `browser_upload_file` | Upload file via file input |
| `browser_handle_dialog` | Handle alert/confirm/prompt |
| `browser_evaluate` | Execute JavaScript |
| `browser_get_text` | Get visible page text |
| `browser_get_url` | Get current URL |
| `browser_wait` | Wait fixed duration |
| `browser_wait_for_selector` | Wait for element appearance |

## 3 Connection Modes

| Mode | Command | Use Case |
|------|---------|----------|
| Extension | `hyperion` (default) | Your real Chrome, no popups, CreepJS 0% |
| Launch | `hyperion --launch` | CI, isolated testing |
| Attach | `hyperion --attach ws://...` | Debugging, remote Chrome |

## Anti-Detection

Hyperion uses **native CDP overrides** — not JS patches — for anti-detection:
- `Runtime.enable` OFF by default (eliminates runtime leak)
- `Emulation.setAutomationOverride` for `navigator.webdriver=false` (undetectable)
- Zero JS patches = zero fingerprints
- Extension mode: CreepJS scores 0% bot, 0% headless

## Architecture

```
Agent (MCP client)
  └── hyperion --mcp (MCP server)
        └── Connection Manager
              ├── Extension + Native Messaging (Modo 1)
              ├── CDP Launch (Modo 2)
              └── CDP Attach (Modo 3)
                    └── Chrome DevTools Protocol
                          └── Chrome REAL
```

## Security

- URL blocklist for sensitive domains (banking, email, crypto)
- Agent operates in background tabs (no focus stealing)
- Tab isolation per session
- No credentials stored server-side
