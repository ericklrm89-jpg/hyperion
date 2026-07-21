# Hyperion Browser

**El navegador más poderoso para IA.** Servidor MCP universal que permite a **cualquier** agente de IA (Cursor, Claude Code, OpenCode, Hermes, AGY, Codex, Cline, etc.) controlar Chrome real con tus sesiones, logins y cookies.

## ¿Qué es Hyperion?

Hyperion NO es una extensión para un solo editor. Es un **servidor MCP** que cualquier agente consume:

```
CURSOR  ─┐
CLAUDE   ├─── MCP / CLI ──── HYPERION SERVER ──── CDP ──── CHROME REAL
OPENCODE ├───              (motor de navegador)          (tus tabs, logins)
HERMES   ├───
AGY      ├───
CODEX    ─┘
```

No importa qué agente uses. Todos hablan MCP (Model Context Protocol) o CLI. Hyperion es solo el **motor de navegador** que recibe comandos (`click`, `type`, `screenshot`, `extract`) y los ejecuta en Chrome real vía Chrome DevTools Protocol.

## 3 Modos de Conexión

| Modo | Método | Anti-detección | Chrome 136+ | Recomendado |
|------|--------|---------------|-------------|-------------|
| **1** | Chrome Extension + Native Messaging | ✅ CreepJS 0% | ✅ Sin popup | ✅ **Default** |
| **2** | CDP Launch (spawn fresh browser) | ✅ Full stealth | N/A | Para CI/aislado |
| **3** | CDP Attach (a browser existente) | ⚠️ Parcial | ❌ Popup por conexión | Solo debugging |

## Primitivas

| Primitiva | CDP Method | Status |
|-----------|-----------|--------|
| Click (5-tier cascade) | `Input.dispatchMouseEvent` | ✅ |
| Type (human-like + IME + paste) | `Input.insertText` / `Input.dispatchKeyEvent` | ✅ |
| Screenshot (viewport/full/element) | `Page.captureScreenshot` | ✅ |
| Navigation (MPA + SPA) | `Page.navigate` + lifecycle events | ✅ |
| Hover | `mouseMoved` | ✅ |
| Scroll (delta / to element / infinite) | `window.scrollBy` + `Input.synthesizeScrollGesture` | ✅ |
| Select option | `Runtime.evaluate` + change event | ✅ |
| File upload | `DOM.setFileInputFiles` + file chooser intercept | ✅ |
| Dialog (alert/confirm/prompt) | `Page.javascriptDialogOpening` + `handleJavaScriptDialog` | ✅ |
| Right-click / Double-click | `dispatchMouseEvent` with button/clickCount | ✅ |
| Drag & drop | Multi-step mouse events | ✅ |
| Execute JavaScript | `Runtime.evaluate` / `callFunctionOn` | ✅ |
| Extract (tables/cards/lists/JSON-LD) | DOM-first con schema inference | ✅ |

## Anti-detección

- `Runtime.enable` OFF por defecto → elimina runtime leak detectable
- `Emulation.setAutomationOverride` → `navigator.webdriver = false` (nativo, no detectable)
- Zero JS patches → sin fingerprints
- Extension + Native Messaging → evita popup "Allow remote debugging?" de Chrome 136+
- `Emulation.setFocusEmulationEnabled` → tabs en background no se throttlean

## Quick Start

```bash
# Instalar
npm install -g hyperion-browser

# Iniciar servidor MCP (Modo 1: Extension)
hyperion

# O modo 2: Launch fresh browser
hyperion --launch

# O modo 3: Attach a browser existente
hyperion --attach ws://localhost:9222/devtools/page/xxx

# Como MCP server para Cursor/Claude Code/OpenCode
hyperion --mcp

# CLI directo
hyperion click "#submit" --tab "https://example.com"
hyperion type "#search" "hello world"
hyperion screenshot --full-page
hyperion extract "table" --format csv
```

## Arquitectura

```
hyperion/
├── src/
│   ├── index.ts                    Entry point + MCP server
│   ├── connection/                 Connection Manager (3 modos)
│   ├── cdp/                        CDP domain lifecycle, commands, events
│   ├── primitives/                 Click, Type, Screenshot, Navigate, etc.
│   ├── tools/                      MCP tool definitions (25+ tools)
│   ├── extraction/                 DOM-first extraction engine
│   ├── perception/                 HyperScene builder (7 capas)
│   ├── stealth/                    Anti-detection engine
│   └── screenshot/                 Screenshot + overlay capture
├── extension/                      Chrome Extension (Modo 1)
├── native-host/                    Native Messaging Host
└── tests/
