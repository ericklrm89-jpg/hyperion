# AGENTS.md — Reglas del Agente Hyperion V2

> Reglas de automatización, ejecución, formatos multimedia y arquitectura para agentes AI que utilizan Hyperion.

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
- **Singleton Guard:** Antes de inyectar o repintar, ejecutar teardown atómico (`destroy()`) para garantizar 0 capas sobre capas y 0 intervalos huérfanos.

### 3. Conexión CDP Resiliente y Alerta de Regla de Oro
- Conectar siempre a Chrome vía WebSocket sobre CDP (puerto predeterminado `9222`, IPv4 `127.0.0.1:9222`).
- Usar `ConnectionHealthCheck` y `HeartbeatManager` para detectar desconexiones silenciosas.
- **Alerta de Desconexión:** Si el puerto 9222 no responde (`ECONNREFUSED` / timeout), emitir la alerta inmediata al usuario para ejecutar `C:\hyperion\launch-chrome-debug.bat`.
- Priorizar eventos nativos del DOM (`element.click()`) o `DOM.setFileInputFiles` para subida de archivos directa sin invocar el selector de archivos del sistema operativo.

### 4. Higiene de Procesos
- Lanzar Chrome con `launch-chrome-debug.bat` o `launch-chrome-debug.ps1`.
- Si una conexión CDP se congela o finaliza abruptamente, limpiar los locks del perfil (`SingletonLock`, `SingletonCookie`, `SingletonSocket`) y detener procesos Node huérfanos antes de reconectar.
- Ejecutar pruebas unitarias con `forceExit: true` y `maxWorkers: 2` para evitar acumulación de procesos en segundo plano.

---

## 📐 REGLAS DE ORO: FORMATOS Y PROPORCIONES DE ASPECTO (ASPECT RATIOS & RESOLUCIONES)

### Ley #1 — Proporción Obligatoria por Tipo de Publicación

1. **Reels, TikToks y YouTube Shorts (Video Vertical Pantalla Completa):**
   - **Proporción Obligatoria:** `9:16` (1080 x 1920 px).
   - **En Instagram Web:** Por defecto Instagram fuerza un recorte cuadrado `1:1`. Es **OBLIGATORIO** hacer clic en el botón de recorte (esquina inferior izquierda del preview modal) y seleccionar **"9:16"** o **"Original"** antes de hacer clic en "Siguiente / Next". NUNCA permitir que Instagram recorte un Reel a 1:1.
   - **En Facebook Reels:** El video debe publicarse bajo el flujo de Reels en formato vertical `9:16` sin bandas negras laterales.
   - **En TikTok Studio:** Toda subida debe respetar la relación `9:16` nativa.

2. **Posts de Feed (Imágenes y Carruseles):**
   - **Proporción Recomendada:** `4:5` vertical (1080 x 1350 px) para dominar el área visual en el feed móvil de Instagram y Facebook, o `1:1` cuadrado (1080 x 1080 px).
   - **En Instagram Web:** Al subir imágenes verticales `4:5` o `9:16`, seleccionar siempre la opción de relación de aspecto en el menú de recorte para evitar que se corten los textos o cabeceras.

3. **Zona Segura de Texto y Elementos Críticos (Safe Zones):**
   - **Margen Superior (Top Safe Zone):** Mantener títulos, cabeceras y logos a un mínimo de 150 px del borde superior (lejos de la barra de estado y buscador).
   - **Margen Inferior (Bottom Safe Zone):** Mantener CTAs, enlaces y textos a un mínimo de 300 px del borde inferior (lejos de la descripción, botones de interacción y selector de audio).
   - **Margen Lateral (Side Safe Zones):** Mínimo 60 px a izquierda y derecha.

4. **Regla de Logo Único y Fidelidad de Marca (FairDraw):**
   - **Un Solo Logo:** Incluir siempre *"ONE single logo only. NO double logo"* en los prompts de generación.
   - **Logo Real por Referencia:** Pasar siempre `logo_real.png` como `ImagePaths` — NUNCA confiar en que el modelo dibuje el logo de memoria.
   - **Cero Badges Falsos:** NUNCA incluir badges de "App Store" o "Google Play" para plataformas exclusivamente Web como FairDraw (`fairdrawapp.com`).
