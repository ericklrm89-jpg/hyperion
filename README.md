# Hyperion V2 - LLM-Native Universal Web Agent

**El navegador más poderoso para IA.** Servidor MCP universal que permite a **cualquier** agente de IA (Claude, Cursor, Cline, OpenCode, etc.) controlar Chrome real con 5 motores de percepción, heartbeat resiliente, y visión en tiempo real.

```
CLAUDE CODE ──┐
CURSOR       ├─── MCP / CLI ──── HYPERION V2 ──── CDP ──── CHROME REAL
CLINE        │     (Zod schemas)   (5 engines)          (tus tabs, logins)
OPENCODE     ├─── Heartbeat + Auto-Reconnect
AGY          │     Real-Time Vision Streaming
CODEX        │     Overlay [0][1][2]...
HERMES       └─── Action Registry + Full Tracing
```

## 🚀 ¿Qué Hay de Nuevo en V2?

### **1. LLM-Friendly API con Zod Schemas**
- ✅ **Auto-documentación** → Los LLMs entienden cada tool sin ambigüedad
- ✅ **Type-safe execution** → Validación automática de inputs
- ✅ **16+ herramientas pre-registradas** → screenshot, click, type, overlay, vision, etc.

### **2. Heartbeat + Auto-Reconexión Resiliente**
- ✅ **Health monitoring** → Detecta desconexiones silenciosas
- ✅ **Exponential backoff** → Reconnect automático con delay creciente
- ✅ **Connection pool** → Métricas en tiempo real (latency, mensajes, errores)
- ✅ **No más "connection lost"** → Se recupera automáticamente

### **3. Real-Time Vision Streaming**
- ✅ **Frames continuos** → 1-10 fps configurable
- ✅ **Change detection** → Detecta qué elementos se agregaron/removieron
- ✅ **Platform detection** → Identifica Instagram, TikTok, Facebook, etc.
- ✅ **Full element metadata** → Posición, texto, selectores, roles ARIA

### **4. Universal Action Framework**
- ✅ **Full execution tracing** → Screenshot before/after, retry history, duration
- ✅ **Automatic retry** → Configurable por acción (timeout, backoff)
- ✅ **Execution history** → Últimas 1000 acciones con logs completos
- ✅ **Listener pattern** → Subscribe a eventos de ejecución

### **5. Overlay Engine Robusto**
- ✅ **Inyección UNA SOLA VEZ** → Garantizado, sin duplicados
- ✅ **Auto-refresh** → Se actualiza ante cambios en el DOM
- ✅ **MutationObserver + Resize** → Siempre sincronizado
- ✅ **Click by ID [0][1][2]** → LLM ve los números y hace click

## 📋 Arquitectura V2

```
src/
├── core/
│   ├── types.ts                    ← Universal types (16 interfaces)
│   └── ActionRegistry.ts           ← Action execution + tracing
│
├── connection/
│   ├── transport.ts                ← Base transport (CDP protocol)
│   ├── resilience/
│   │   ├── HeartbeatManager.ts     ← Health monitoring
│   │   ├── ReconnectionManager.ts  ← Auto-reconnect + backoff
│   │   ├── ConnectionPool.ts       ← Metrics + connection management
│   │   └── ConnectionHealthCheck.ts
│   ├── attach.ts                   ← WebSocket attach mode
│   ├── launch.ts                   ← Fresh Chrome launch
│   └── extension.ts                ← Chrome extension mode
│
├── vision/
│   └── VisionEngine.ts             ← Real-time frame capture + analysis
│
├── overlay/
│   └── OverlayEngine.ts            ← Robust element mapping
│
├── mcp/
│   ├── LLMServer.ts                ← 16+ registered actions
│   └── MCPServerAdapter.ts         ← MCP protocol bridge
│
├── hyperion.ts                     ← Main client API
└── cli.ts                          ← CLI entry point (MCP/interactive)
```

## 🎯 Casos de Uso

### Claude Code / Cursor / Cline
```bash
# Start MCP server
hyperion --mcp --launch

# Configure in your editor's settings
# Claude Code automatically discovers and uses all 16+ tools
```

### Así usa el LLM una acción:
```json
{
  "actionId": "overlay-inject",
  "input": {
    "refreshIntervalMs": 1000
  }
}
→ Response: {
    "injected": true,
    "elementCount": 42,
    "elements": [
      { "overlayId": 0, "text": "Click here", "x": 100, "y": 200 },
      { "overlayId": 1, "text": "Submit", "x": 150, "y": 250 },
      ...
    ]
  }
```

```json
{
  "actionId": "overlay-click",
  "input": { "overlayId": 5 }
}
→ Response: { "clicked": true, "overlayId": 5 }
```

## 📊 16+ Acciones Registradas

| Acción | Categoría | Perception | Timeout | Retry |
|--------|-----------|------------|---------|-------|
| `screenshot` | visual | visual | 5s | ✗ |
| `navigate` | navigation | none | 30s | ✓ (2x) |
| `click` | interaction | visual | 3s | ✓ (3x) |
| `type` | interaction | none | 5s | ✓ (2x) |
| `overlay-inject` | visual | visual | 5s | ✗ |
| `overlay-get` | visual | visual | 2s | ✗ |
| `overlay-click` | interaction | visual | 3s | ✓ (2x) |
| `overlay-kill` | visual | none | 2s | ✗ |
| `vision-start` | visual | visual | ∞ | ✗ |
| `vision-stop` | visual | none | ∞ | ✗ |
| `extract` | extraction | none | 5s | ✗ |
| `wait` | utility | none | 15s | ✗ |
| `scroll` | interaction | none | 3s | ✗ |
| `evaluate` | utility | none | 5s | ✗ |
| `hover` | interaction | visual | 2s | ✗ |
| `select-option` | interaction | none | 3s | ✗ |

## 🔧 Instalación

```bash
npm install -g hyperion-browser

# O desde source
git clone https://github.com/ericklrm89-jpg/hyperion.git
cd hyperion
npm install
npm run build
```

## 🎬 Quick Start

### Modo MCP (Claude Code, Cursor, etc.)
```bash
# Launch fresh Chrome + MCP server
hyperion --mcp --launch --port 9222

# O attach a Chrome existente
hyperion --mcp --attach ws://localhost:9222/devtools/page/xxx

# O usar extension
hyperion --mcp --extension
```

### CLI Interactivo
```bash
hyperion --launch

> navigate https://example.com
> screenshot
> click "button.submit"
> type "#email" "test@example.com"
> scroll down 500
> eval "document.title"
```

## 🏗️ Arquitectura de Pilares

### **PILAR 1: Core Types**
Definiciones universales compartidas por todo el sistema:
- `ActionDefinition<T>` → Schema Zod + metadata
- `ActionExecution` → Full tracing con screenshots
- `VisionFrame` → Frame con 30+ propiedades
- `ConnectionMetrics` → Health monitoring

### **PILAR 2: Resilience Layer**
**Heartbeat + Auto-Reconnect + Connection Pool**

```typescript
// Heartbeat detecta desconexiones
const hb = new HeartbeatManager(
  sender,
  onHealthChange,
  { maxMissed: 3, clientId: 'agent-1' }
);
hb.start(5000); // Ping cada 5s

// ReconnectionManager reintentos exponenciales
const rc = new ReconnectionManager({
  maxAttempts: 10,
  initialBackoffMs: 1000,
  maxBackoffMs: 30000,
  backoffMultiplier: 1.5,
});
await rc.executeWithReconnect(() => transport.call('Method'));

// ConnectionPool métricas
const pool = new ConnectionPool();
pool.recordMessageSent('conn-1', 'Page.navigate', 250);
const metrics = pool.getMetrics('conn-1');
// { state, messagesSent, averageLatency, errorCount, ... }
```

### **PILAR 3: Universal Action Framework**
**Ejecución segura + Retry + Tracing**

```typescript
const registry = new ActionRegistry();

// Registrar acción
registry.register({
  id: 'custom-action',
  name: 'My Action',
  description: '...',
  schema: z.object({ ... }),
  retry: { maxAttempts: 3, backoffMs: 1000 },
  timeout: 10000,
});

// Ejecutar con tracing
const execution = await registry.execute(
  'custom-action',
  { input: 'value' },
  async (validated) => {
    // Tu código aquí
    return result;
  },
  {
    captureScreenshots: true,
    beforeScreenshot: () => hyperion.screenshot.capture(),
    afterScreenshot: () => hyperion.screenshot.capture(),
  }
);

// execution contiene:
// - status, duration, attempts
// - output, error (si falló)
// - screenshots before/after/error
// - retry count y historial

registry.onExecution(exec => {
  console.log(`Action ${exec.actionId} -> ${exec.status} (${exec.duration}ms)`);
});
```

### **PILAR 4: Real-Time Vision**
**Streaming + Change Detection**

```typescript
const vision = new VisionEngine(hyperion);

// Start streaming
await vision.startStreaming(1000); // 1 frame/sec

vision.on('frame', (frame: VisionFrame) => {
  console.log(`Frame ${frame.id}:`);
  console.log(`  URL: ${frame.url}`);
  console.log(`  Elements: ${frame.elements.length}`);
  console.log(`  Platform: ${frame.platform}`);
  console.log(`  Changes: +${frame.changes?.added.length} -${frame.changes?.removed.length}`);
});

vision.on('frame-changed', (frame) => {
  // Solo elementos nuevos/removidos
  console.log('DOM cambió:', frame.changes);
});

const latest = vision.getLatestFrame();
const history = vision.getFrameHistory(10);
const stats = vision.getStats();

vision.stopStreaming();
```

### **PILAR 5: Overlay Engine**
**Inyección robusta + Auto-sync**

```typescript
const overlay = new OverlayEngine();

// Inyectar (una sola vez, garantizado)
await overlay.ensureInjected(hyperion, { refreshIntervalMs: 1000 });

// Obtener elementos
const elements = await overlay.getElements(hyperion);
// [
//   { overlayId: 0, text: 'Login', x: 100, y: 200 },
//   { overlayId: 1, text: 'Sign Up', x: 150, y: 200 },
// ]

// Click por ID
await overlay.clickById(hyperion, 5);

// Eliminar overlay
await overlay.kill(hyperion);
```

### **PILAR 6: LLM Server**
**MCP Bridge + 16+ Actions**

```typescript
const llmServer = new LLMServer(hyperion);

// Automáticamente registra 16+ acciones
const definitions = llmServer.getActionDefinitions();
// Cada una tiene schema Zod auto-documentado

// Ejecutar acción (como lo haría un LLM)
const result = await llmServer.executeAction('overlay-inject', {
  refreshIntervalMs: 1000,
});

// Ejecuta, trackea, captura screenshots, reintentos
const history = llmServer.getExecutionHistory(100);
const stats = llmServer.getStats();
```

## 🎛️ 3 Modos de Conexión

| Modo | Método | Anti-detección | Chrome 136+ | Recomendado |
|------|--------|---------------|-------------|-------------|
| **Extension** | Native Messaging | ✅ CreepJS 0% | ✅ Sin popup | ✅ **Default** |
| **Launch** | Fresh browser spawn | ✅ Full stealth | N/A | Para CI/aislado |
| **Attach** | WebSocket a browser existente | ⚠️ Parcial | ❌ Popup | Solo debugging |

## 🔒 Anti-Detección

- `Runtime.enable` OFF → Elimina runtime leak
- `Emulation.setAutomationOverride` → `navigator.webdriver = false` (nativo)
- Zero JS patches → Sin fingerprints
- Extension + Native Messaging → Evita popup de Chrome 136+
- `Emulation.setFocusEmulationEnabled` → Tabs en background no throttle

## 📈 Métricas y Debugging

```typescript
// Connection metrics
const pool = new ConnectionPool();
const metrics = pool.getMetrics('conn-1');
// {
//   state: 'connected',
//   messagesSent: 1250,
//   messagesReceived: 1240,
//   failedMessages: 2,
//   averageLatencyMs: 45.2,
//   errorCount: 1,
//   reconnectAttempts: 0
// }

// Action execution stats
const stats = registry.getStats();
// {
//   totalExecutions: 500,
//   successful: 495,
//   failed: 5,
//   successRate: 99%,
//   averageDurationMs: 234.5
// }

// Execution trace
const exec = registry.getExecutionById('action-id-123');
// {
//   status: 'success',
//   duration: 1234,
//   attempts: [
//     { attempt: 1, result: {...} },
//     { attempt: 2, error: '...' },
//     { attempt: 3, result: {...} }
//   ],
//   screenshots: [
//     { phase: 'before', base64: '...' },
//     { phase: 'after', base64: '...' }
//   ]
// }
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Watch mode
npm run test -- --watch
```

## 📚 Documentación Completa

- **[Core API](./docs/API.md)** - Referencia completa
- **[Schema Definitions](./docs/SCHEMAS.md)** - Todos los Zod schemas
- **[Examples](./examples/)** - Ejemplos funcionales
- **[Architecture](./docs/ARCHITECTURE.md)** - Diagrama detallado

## 🤝 Integración con LLMs

### Claude Code
```json
{
  "mcpServers": {
    "hyperion": {
      "command": "hyperion",
      "args": ["--mcp", "--launch"]
    }
  }
}
```

### Cursor
En `.cursor/settings.json`:
```json
{
  "rules": {
    "hyperion": "hyperion --mcp --launch"
  }
}
```

### Cline
En cline_config.json:
```json
{
  "mcpServers": [
    {
      "name": "hyperion",
      "command": "npx hyperion --mcp --launch"
    }
  ]
}
```

## 📄 Licencia

MIT - Libre para uso comercial y personal

## 🚀 Roadmap V2.1

- [ ] Video recording integration
- [ ] Multi-tab management
- [ ] Advanced gesture support (swipe, pinch)
- [ ] Chrome DevTools integration
- [ ] Cloud persistence for execution logs
- [ ] Performance profiling hooks

## 💬 Support

- GitHub Issues: [hyperion/issues](https://github.com/ericklrm89-jpg/hyperion/issues)
- Discussions: [hyperion/discussions](https://github.com/ericklrm89-jpg/hyperion/discussions)

---

**Hyperion V2** - The LLM-native browser automation framework.

Built with 💚 for AI agents that want to automate the web properly.
