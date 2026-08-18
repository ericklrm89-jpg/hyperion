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

## Arquitectura

```
hyperion/
├── src/
│   ├── index.ts                    Entry point + MCP server
│   ├── cli.ts                      CLI entry point
│   ├── config.ts                   Configuration
│   ├── connection/                 Connection Manager (3 modos)
│   ├── cdp/                        CDP domain lifecycle, commands, events
│   ├── primitives/                 Click, Type, Screenshot, Navigate, etc.
│   ├── tools/                      MCP tool definitions (25+ tools)
│   │   └── mcp-server.ts           MCP server implementation
│   ├── extraction/                 DOM-first extraction engine
│   ├── perception/                 ⬅️ HyperScene builder (7 capas)
│   ├── layers/                     ⬅️ Platform-specific layer detection
│   ├── stealth/                    Anti-detection engine
│   └── screenshot/                 Screenshot + overlay capture
├── extension/                      Chrome Extension (Modo 1)
├── native-host/                    Native Messaging Host
├── scripts/                        ⬅️ Platform automation scripts
│   ├── instagram/                  Instagram scripts
│   ├── whatsapp/                   WhatsApp scripts
│   ├── tiktok/                     TikTok scripts
│   └── facebook/                   Facebook scripts
└── tests/
```

## Platform Modules Architecture

Cada plataforma tiene su propio módulo en `src/layers/` con detectores de UI específicos.
Los scripts de automation van en `scripts/` por plataforma.

```
src/layers/
├── instagram.ts                    Detector de capas Instagram
│   ├── detectDialog()              Find active dialog (create, share, menu)
│   ├── detectSidebar()             Left nav bar bounds
│   ├── detectProfileGrid()         Post/reel grid items
│   └── detectPostActions()         3-dot menu, save, share

├── whatsapp.ts                     Detector de capas WhatsApp Web
│   ├── detectChatList()            Contact list panel
│   ├── detectMessageArea()         Message thread view
│   ├── detectInputBox()            Message input area
│   └── detectAttachments()         Media/attachment panel

├── tiktok.ts                       Detector de capas TikTok
│   ├── detectVideoFeed()           Scrolling video feed
│   ├── detectComments()            Comments panel/drawer
│   ├── detectUploadFlow()          Upload wizard steps
│   └── detectEditor()              Video editor toolbar

├── facebook.ts                     Detector de capas Facebook
│   ├── detectNewsFeed()            Main feed area
│   ├── detectStories()             Stories bar
│   ├── detectCreatePost()          Post creation dialog
│   └── detectReactions()           Like/love/wow picker

└── gemini.ts                       Detector de capas Gemini Web
    ├── detectConversation()        Chat thread
    ├── detectInputArea()           Prompt input
    └── detectModelSelector()       Model picker dropdown
```

### Overlay System (In-Browser)

Sistema de overlay visual **persistente** inyectado en la página. Usa `position:fixed` con z-index máximo para mostrar rectángulos numerados sobre elementos interactivos.

```
Overlay
├── Estilo único (.hy-st)           Inyectado una vez en <head>
├── Divs contenedores (.hy-el)      position:fixed, border coloreado
├── Selector de elementos           button, a[href], input, [role=*], etc.
├── IDs estables                    hash( tag + href/aria/text + grilla 200px )
├── Resize listener                 window.addEventListener('resize', render)
└── Intervalo de refresco           2000ms (configurable)
```

Reglas del overlay:
- **NUNCA matar el overlay entre scripts** → una sola inyección, verificar `__HY_KILL` antes de cleanup
- **Siempre incluir post links** → `a[href*="/p/"],a[href*="/reel/"]` incluso sin texto visible
- **IDs basados en href** para links, **grilla 200px** para no-links → estables ante micro-desplazamientos

### Layer Detection (elementsFromPoint)

Sistema para identificar en qué capa de la UI está interactuando el usuario:

```typescript
// Pseudocódigo del detector de capas
function getActiveLayer(): 'dialog' | 'sidebar' | 'content' | 'unknown' {
  const points = elementosEnVentana();
  if (hayDialogActivo(points)) return 'dialog';
  if (estamosEnSidebar(points)) return 'sidebar';
  if (estamosEnFeed(points)) return 'content';
  return 'unknown';
}
```

- Usa `document.elementsFromPoint(x, y)` para determinar qué capa está activa
- Detecta `[role="dialog"]` por su posición central y tamaño mínimo
- Filtra elementos por capa para mostrar solo los relevantes en el overlay

### Click System (5-Tier Cascade)

```
1. CDP Click coordinate          click(x, y) vía Input.dispatchMouseEvent
2. CDP Click by selector         document.querySelector(sel).click()
3. Runtime click with events     mousedown + mouseup + click event dispatch
4. Element.focus() + Enter       Para inputs y botones de formulario
5. JavaScript fallback           onclick/onmousedown handler invocation
```

Clicks por overlay ID:
```typescript
// Click en elemento con ID visible [42]
async function clickOverlayId(id: number) {
  const result = await browser.evaluate(`
    (function() {
      const el = document.querySelector('.hy-el');
      // ... find element by sid, get center coordinates
      return { x, y };
    })()
  `);
  await browser.click(result.x, result.y);
}
```

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

## Scripts de Automatización

Los scripts en `scripts/` son módulos Node.js autocontenidos que usan Hyperion vía `import { Hyperion } from 'hyperion-browser'`.

Estructura típica:
```typescript
import { Hyperion } from 'hyperion-browser';

async function main() {
  const h = new Hyperion({ mode: 'attach', websocketUrl: WS_URL });
  await h.connect();
  
  // 1. Inyectar overlay persistente
  await injectOverlay(h);
  
  // 2. Mapear elementos
  const elements = await mapElements(h);
  
  // 3. Interactuar
  await h.click(elements[5].x, elements[5].y);
  
  await h.disconnect();
}
```

## Scripts de Referencia (Instagram)

| Script | Propósito |
|--------|-----------|
| `instagram-one-overlay.js` | Overlay persistente estable con resize listener |
| `instagram-publish-v2.js` | Publicar reel con caption |
| `instagram-delete-flow.js` | Eliminar reel (3-dot → Eliminar → confirmar) |
| `instagram-scroll-posts.js` | Desplazar grilla y listar posts |
