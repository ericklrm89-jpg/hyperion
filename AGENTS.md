# AGENTS.md — Reglas del Agente Hyperion V2

> Reglas de automatización, ejecución y arquitectura para agentes AI que utilizan Hyperion.

---

## 🏛️ ARQUITECTURA Y PRINCIPIOS DE AUTOMATIZACIÓN

### 1. Servidor MCP y Protocolo Stdio
- **JSON-RPC sobre `stdout`:** `stdout` está reservado exclusivamente para mensajes JSON-RPC del protocolo MCP.
- **Logging obligatorio en `stderr`:** Todo log de diagnóstico, traza o error debe enviarse a `stderr` utilizando `logger` (`src/core/logger.ts`).
- **Validación con Zod:** Toda acción expuesta al LLM debe definir un schema tipado con Zod para auto-documentación y validación automática de parámetros.

### 2. Capa Manus / Overlay Dinámico
- Inyectar el overlay interactivo antes de interactuar visualmente con elementos web.
- Los badges numéricos `[0..N]` proveen coordenadas estables y selectores directos al agente.
- El overlay opera con un ciclo de refresco y MutationObserver dinámico para sincronizarse con SPAs y cambios de viewport.

### 3. Conexión CDP Resiliente
- Conectar siempre a Chrome vía WebSocket sobre CDP (puerto predeterminado `9222`, IPv4 `127.0.0.1:9222`).
- Usar `ConnectionHealthCheck` y `HeartbeatManager` para detectar desconexiones silenciosas.
- Priorizar eventos nativos del DOM (`element.click()`) o `DOM.setFileInputFiles` para subida de archivos directa sin invocar el selector de archivos del sistema operativo.

### 4. Higiene de Procesos
- Lanzar Chrome con `launch-chrome-debug.bat` o `launch-chrome-debug.ps1`.
- Si una conexión CDP se congela o finaliza abruptamente, limpiar los locks del perfil (`SingletonLock`, `SingletonCookie`, `SingletonSocket`) y detener procesos Node huérfanos antes de reconectar.
