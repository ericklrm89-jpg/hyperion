---
name: web-agent-hyperion
description: Automate browser interactions, publish social media content, and interact with web applications using persistent DOM overlays, numeric element badges, layer detection, 5 Hyperion engines, and CDP coordinates. Contains dedicated sub-skills in the references/ folder for each web platform.
---

# Hyperion Universal Web Agent — Master Technical Reference (v11)

> 🛑 **LEY ABSOLUTA E INQUEBRANTABLE (PROHIBIDO OLVIDAR)**
>
> **LA CAPA TIPO MANUS CON CUADROS DE COLORES Y NÚMEROS BADGES [1..N] DEBE ESTAR ACTIVA, VISIBLE Y DINÁMICA SIEMPRE ANTES DE INTERACTUAR CON CUALQUIER ELEMENTO.**
>
> - Nunca hagas clic, escritura, scroll o inyección de archivos sin antes haber inyectado la capa Manus y verificado el banner: `CAPA ACTIVA: [NOMBRE] [N ELEMENTOS]`.
> - La capa DEBE tener un bucle dinámico de repintado (cada 250ms) — nunca estática.
> - Ante cualquier sub-tarea de automatización web, lee la sub-skill correspondiente en `references/<plataforma>.md`.

> 🚫 **PROHIBIDO: Abrir pestañas o navegar en el browser para "inspeccionar" la UI cuando ya se tienen logs, capturas o código suficiente.**
>
> - Si el bug se puede analizar con el código fuente del script + los logs de ejecución, **NO** uses `navigate_page` ni abras nueva pestaña.
> - Navegar a una URL del usuario puede interrumpir su sesión activa, romper un flujo en curso o redirigir a login si no hay sesión.
> - Solo navega en el browser como parte de la automatización real del script, no como paso de diagnóstico.


---

## 📁 ARQUITECTURA DE SUB-SKILLS POR PLATAFORMA

Hyperion delega el conocimiento particular de cada sitio web a archivos especializados en el subdirectorio `references/`. La Skill Maestra (este archivo) gobierna los mecanismos core, mientras que las sub-skills gobiernan el mapeo de elementos:

| Plataforma | Archivo de Sub-skill | Enfoque |
|---|---|---|
| Google Gemini Web | `references/gemini.md` | Generación de video animado, storyboard, prompt y descarga |
| Facebook | `references/facebook.md` | Publicación de Reels y posts en el Feed |
| TikTok Studio | `references/tiktok.md` | Subida de videos, privacidad y descripción |
| Instagram | `references/instagram.md` | Publicación de Reels y posts con hashtags |
| **FairDraw (cliente)** | `references/fairdraw.md` | Generación de imágenes con logo real, CTA web, plantillas validadas |

---

## ⚙️ LOS 5 MOTORES CORE DE HYPERION

### Motor 1 — DOM Visual Overlay Engine (Capa Manus Dinámica)

La capa Manus es obligatoria antes de cualquier interacción. No debe ser una inyección estática de una sola vez, ya que los cambios en el DOM o el scroll del usuario desalinearán los badges. Debe repintarse dinámicamente cada 250ms.

**Script de inyección genérico para evaluar en la pestaña activa (`Runtime.evaluate`):**

```javascript
(function(){
  try {
    if (window.__HY_SINGLE_TIMER) { clearInterval(window.__HY_SINGLE_TIMER); window.__HY_SINGLE_TIMER = null; }
    document.querySelectorAll('.hy-el, .hy-st, .hy-rr').forEach(function(e){ e.remove(); });
    window.__HY_KILL_ALL = false;
  } catch(e){}

  if(!document.querySelector('.hy-st')){
    var s = document.createElement('style');
    s.className = 'hy-st';
    s.textContent = '.hy-rr{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 11px/13px monospace;color:#fff;text-shadow:0 0 3px #000,0 0 6px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;}';
    document.head.appendChild(s);
  }

  var C = [
    {f:'rgba(255,0,0,0.4)', b:'#F00'}, {f:'rgba(0,200,0,0.4)', b:'#0C0'},
    {f:'rgba(0,100,255,0.4)', b:'#06F'}, {f:'rgba(200,200,0,0.4)', b:'#CC0'}
  ];

  function getAllDeepElements(root) {
    root = root || document;
    var selector = 'button, a, input, textarea, select, [role="button"], [role="menuitem"], [role="tab"], [role="link"], [role="switch"], [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
    var els = Array.from(root.querySelectorAll(selector));
    var allNodes = Array.from(root.querySelectorAll('*'));
    for (var i = 0; i < allNodes.length; i++) {
      if (allNodes[i].shadowRoot) { els = els.concat(getAllDeepElements(allNodes[i].shadowRoot)); }
    }
    return els;
  }

  function getActiveLayerData(){
    var w = window.innerWidth, h = window.innerHeight;
    var all = getAllDeepElements(document);
    var vis = [];
    for (var i = 0; i < all.length; i++){
      try {
        var el = all[i];
        if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
        var r = el.getBoundingClientRect();
        if (r.width < 12 || r.height < 12) continue;
        if (r.right < 0 || r.bottom < 0 || r.left > w || r.top > h) continue;
        var cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
        if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
        var at = document.elementsFromPoint(cx, cy);
        if (!at || at.length === 0) continue;
        var top = at[0], onTop = (top === el || el.contains(top));
        if (!onTop) continue;
        var aria2 = el.getAttribute('aria-label') || el.getAttribute('title') || '';
        var rawText = aria2 || el.textContent || '';
        var text = rawText.replace(/[\u200b-\u200f\ufeff\u00ad]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
        if (!text) continue;
        vis.push({ el: el, rect: r, text: text });
      } catch(e){}
    }
    return { type: 'VISIBLE', elements: vis };
  }

  function render(){
    try {
      document.querySelectorAll('.hy-rr').forEach(function(e){ e.remove(); });
      var layer = getActiveLayerData();
      var els = layer.elements || [];
      var info = document.createElement('div');
      info.className = 'hy-rr';
      info.style.cssText = 'top:3px;left:50%;transform:translateX(-50%);padding:3px 10px;background:rgba(0,0,0,0.85);border-radius:4px;font:bold 12px monospace;color:#0f0;border:1px solid #0f0;white-space:nowrap;';
      info.textContent = layer.type + ' [' + els.length + ' elementos | HYPERION DYNAMIC]';
      document.body.appendChild(info);
      for (var i = 0; i < els.length; i++){
        var e = els[i], r = e.rect, c = C[i % C.length];
        var d = document.createElement('div');
        d.className = 'hy-rr';
        d.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;background:' + c.f + ';border:2px solid ' + c.b + ';';
        d.textContent = '[' + (i + 1) + '] ' + e.text.slice(0, 15);
        document.body.appendChild(d);
      }
    } catch(e){}
  }

  render();
  window.__HY_SINGLE_TIMER = setInterval(render, 250); // Bucle dinámico cada 250ms
})();
```

---

### Motor 2 — CDP Native Engine

Permite enviar comandos directos a Chrome omitiendo limitaciones del sandbox de JS de la página.

```javascript
const WebSocket = require('ws');

function cdpCall(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 999999);
    const handler = (data) => {
      try {
        const res = JSON.parse(data);
        if (res.id === id) {
          ws.removeListener('message', handler);
          if (res.error) reject(new Error(JSON.stringify(res.error)));
          else resolve(res.result || {});
        }
      } catch(e) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
```

---

### Motor 3 — Native File & Download Interception Engine (CERO POPUPS DEL SO)

> 🛑 **MANDATO CRÍTICO E INQUEBRANTABLE**
>
> Jamás permitas que un clic en un elemento web abra el cuadro de diálogo de archivos (subida) o el cuadro "Guardar como" (descarga) de Windows/macOS. Esto congela la ejecución del agente en segundo plano.

**¿Cómo funciona la interceptación nativa vía CDP?**

1. **Habilitar notificaciones de eventos**: Se debe llamar a `Page.enable` al inicio de la conexión. Sin esto, Chrome no enviará eventos espontáneos al WebSocket.
2. **Habilitar interceptor**: Antes del clic de subida, se habilita `Page.setInterceptFileChooserDialog`.
3. **Escuchar evento**: Se captura el evento `Page.fileChooserOpened`.
4. **Inyectar rutas directamente**: Se inyectan las rutas utilizando `backendNodeId` directamente en `DOM.setFileInputFiles` (evitando `DOM.requestNode`).
5. **Comportamiento de descargas**: Se llama a `Page.setDownloadBehavior` con `behavior: 'allow'` y un path determinado para evitar la ventana de "Guardar como".

**Implementación de producción genérica:**

```javascript
async function setupBypasses(ws, downloadPath) {
  // Habilitar dominio Page para recibir los eventos en el WebSocket
  await cdpCall(ws, 'Page.enable');

  // Habilitar interceptor de diálogos de subida
  await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: true });

  // Configurar descargas automáticas sin diálogo "Guardar como"
  await cdpCall(ws, 'Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath
  });
}

async function uploadFilesWithoutDialog(ws, clickCoordinates, filePaths, fileChooserPromise) {
  // Realizar clic físico para simular interacción de usuario segura
  await mouseClick(ws, clickCoordinates.x, clickCoordinates.y);

  // Esperar el evento e inyectar directamente por backendNodeId
  const backendNodeId = await fileChooserPromise;
  await cdpCall(ws, 'DOM.setFileInputFiles', {
    backendNodeId,
    files: filePaths
  });
}
```

---

### Motor 4 — Coordinate & Click Engine

En vez de depender de coordenadas estáticas de píxeles, se leen dinámicamente desde el DOM de la página antes del clic para tolerar cambios de escala o rediseños de UI.

```javascript
async function mouseClick(ws, x, y) {
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}
```

---

### Motor 5 — Dynamic Element Finder & Editor Injection Engine

Mapeo de elementos editores (como editores enriquecidos `contenteditable="true"` o textareas reactivos) inyectando el texto programáticamente en el DOM y disparando eventos sintéticos de entrada (`input`, `change`) para actualizar el estado del framework SPA de la página.

```javascript
async function injectTextToEditor(ws, selector, text) {
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const ed = document.querySelector('${selector}');
        if (ed) {
          ed.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, ${JSON.stringify(text)});
          ed.dispatchEvent(new Event('input', { bubbles: true }));
          ed.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return false;
      })()
    `
  });
}
```

---

## 🛑 REGLAS TÉCNICAS E IMPEDIMENTOS GLOBALES (LEYES HYPERION)

1. **Bucle de repintado de la capa Manus**: El timer de la capa Manus (`setInterval`) debe ser continuo e inmune a llamadas repetidas para evitar colisiones de memoria.
2. **Cero diálogos nativos**: Todo cuadro de diálogo nativo de selector de archivos disparado de forma no interceptada constituye un fallo del script. Se debe usar siempre el **Motor 3 (Interceptación CDP)**.
3. **Detección de estados en segundo plano (Busy wait)**: Al interactuar con motores de generación de IA o procesos asíncronos en la web, el script debe esperar detectando el cambio de estado del botón de envío (de "Detener/Stop" a "Enviar/Send") antes de reanudar o intentar descargar.
4. **Verificación visual mediante Screenshots**: Cada cambio de estado crítico (inyección de archivos, escritura, antes y después de clics críticos) debe ser auditado mediante un screenshot secuencial guardado localmente para depuración rápida.
5. **Sincronización de Hidratación de Frameworks (Angular/React/Vue)**: Después de una navegación, recarga de página o acción de reset (como "Nueva conversación"), se debe esperar a que el elemento clave de la página (editor o input) sea visible en el DOM, seguido de una pausa adicional de estabilización (ej. 3000ms). Esto asegura que los frameworks de JavaScript de la página de destino hayan hidratado y vinculado correctamente sus event listeners. Realizar interacciones antes de que este proceso concluya provocará que los clics no tengan efecto alguno.
6. **Prohibición de Coordenadas de Píxeles Estáticas**: Queda estrictamente prohibido utilizar coordenadas x/y fijas en el código de producción. El script debe realizar consultas al DOM utilizando selectores robustos para determinar en tiempo real las coordenadas exactas de la caja de colisión (`getBoundingClientRect()`) y alimentar de manera dinámica el CDP (`Input.dispatchMouseEvent`).
7. **Orden Correcto de Promesas y Listeners**: El listener de eventos espontáneos como `Page.fileChooserOpened` debe ser registrado en el cliente WebSocket antes de despachar el clic físico CDP. Hacerlo después de disparar el clic provoca condiciones de carrera (race conditions) donde el diálogo se intercepta y descarta antes de que la lógica de inyección de archivos se prepare para recibir el ID de nodo.
8. **Directivas Específicas para Herramientas de MCP (chrome-devtools)**: Cuando los agentes utilicen el set de herramientas del MCP (`click`, `upload_file`, `fill`, `type_text`, etc.):
   - **Evitar `upload_file` del MCP**: No usar la herramienta nativa `upload_file` del MCP, ya que esta delega al sistema operativo y abre popups nativos no controlados en sistemas Windows. Se debe inyectar la lista de paths de forma programática por WebSocket usando el `backendNodeId` obtenido con la interceptación CDP de `Page.setInterceptFileChooserDialog`.
   - **Descarga Silenciosa**: Configurar siempre el comportamiento de descarga en el navegador con `Page.setDownloadBehavior` antes de ejecutar clics físicos en enlaces o botones de descarga para evitar el diálogo "Guardar como" del sistema operativo.
   - **Cálculo Dinámico de Coordenadas**: Antes de despachar cualquier comando de `click` o `hover` del MCP sobre coordenadas de pantalla, ejecutar primero un script de diagnóstico mediante `evaluate_script` en el MCP para resolver las coordenadas exactas de colisión del elemento (`getBoundingClientRect()`) y asegurar una interacción 100% precisa.
9. **Motor 6 — Direct DOM File Injection (Sin clic ni interceptor)**: Si el elemento `<input type="file">` ya existe en el DOM (incluso si está oculto, con `display: none` o tamaño `0x0`), se prefiere evitar por completo el clic físico y la interceptación del diálogo. Se puede realizar una inyección directa resolviendo el `backendNodeId` mediante `DOM.getDocument` + `DOM.querySelector` y llamando inmediatamente a `DOM.setFileInputFiles` sobre dicho nodo. Esto es 100% inmune a condiciones de carrera de diálogos nativos.
10. **Tratamiento de Firmas de Imagen y Recorte Vertical (9:16)**:
    - **Firma interna (JPEG/PNG)**: No confíes en la extensión de archivo (`.png`). Los generadores de IA a menudo producen archivos JPEG (`JFIF` / `ffd8...`) bajo una extensión PNG.
    - **Recorte puro en JS**: Para recortar imágenes cuadradas a la relación de aspecto móvil vertical de Reels e Historias (`9:16`), se debe utilizar una librería puramente escrita en JS como `jpeg-js` (evitando dependencias pesadas nativas como `sharp` en Windows). El tamaño estándar ideal resultante es de `576x1024` píxeles para previsualizarse perfectamente sin distorsión.
11. **Evasión de Diálogos de Confirmación de Salida / Recarga (beforeunload)**:
    - **Prevención DOM**: Antes de recargar la página o navegar a otra URL (`window.location.href`), ejecuta siempre en Runtime: `window.onbeforeunload = null;` para eliminar cualquier manejador que pueda provocar el popup nativo de confirmación ("Reload site? Changes you made may not be saved").
    - **Interceptación Reactiva (CDP)**: Al conectar el WebSocket, configura un listener para el evento `Page.javascriptDialogOpening`. Si se activa, ejecuta inmediatamente el comando `Page.handleJavaScriptDialog` con `{ accept: true }` para evitar que el navegador se congele.

---

## 🧠 LECCIONES APRENDIDAS EN PRODUCCIÓN (Sesiones 2026-07 / 2026-08)

### 🔴 L1 — TikTok: Error `-32000 "Could not find node with given id"` (Shadow DOM)
- **Causa**: `DOM.getDocument` sin `{ depth: -1, pierce: true }` no perfora el Shadow DOM de TikTok Studio. El `nodeId` retornado es del árbol superficial y no existe cuando Chrome intenta ejecutar `setFileInputFiles`.
- **Regla**: **SIEMPRE** llamar a `DOM.getDocument({ depth: -1, pierce: true })` y usar `DOM.querySelectorAll` (no `querySelector`) para obtener todos los nodos de `input[type="file"]`. Resolver el `backendNodeId` con `DOM.describeNode` antes de llamar a `setFileInputFiles`.
- **Sub-skill actualizada**: `references/tiktok.md`

### 🔴 L2 — Windows: CDP usa `127.0.0.1`, NO `localhost`
- **Causa**: En Windows, `localhost` se resuelve a la dirección IPv6 `::1`. Chrome Debug Protocol **solo escucha en IPv4** (`127.0.0.1:9222`). Usar `localhost` da `ECONNREFUSED` aunque Chrome esté arriba.
- **Regla**: En **todos** los scripts de Hyperion, la conexión HTTP al CDP debe ser siempre `http://127.0.0.1:9222/json`.
- **Sub-skill actualizada**: `references/facebook.md`

### 🟡 L3 — Instagram: Reset de pestaña antes del modal de publicación
- **Causa**: Si el modal de "Crear publicación" de Instagram se abre repetidamente en la misma sesión sin navegar previamente al perfil, queda en estado corrupto y el selector de archivos no dispara el evento `change`.
- **Regla**: Antes de abrir el modal de subida, navegar siempre a `https://www.instagram.com/fairdrawapp/` (URL limpia del perfil) y esperar hidratación. Esto resetea el estado interno del modal React.

### 🟡 L4 — Instagram: Inyección de archivo + eventos sintéticos obligatorios
- **Causa**: Llamar solo a `DOM.setFileInputFiles` no activa el canvas renderer de Instagram si no se disparan también los eventos `change` e `input` en **todos** los `input[type="file"]` del DOM.
- **Regla**: Después de `setFileInputFiles`, ejecutar siempre:
  ```javascript
  document.querySelectorAll('input[type="file"]').forEach(inp => {
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
  ```

### 🟡 L5 — Facebook Reels: Sidebar con scroll dinámico
- **Causa**: El sidebar izquierdo del modal de Facebook Reels tiene overflow con scroll. Los botones "Next" y "Publish" quedan fuera del viewport visible y no son clickeables físicamente.
- **Regla**: Antes de hacer clic en cualquier botón del sidebar, ejecutar `parent.scrollTop = parent.scrollHeight` sobre el contenedor scrolleable del sidebar para revelar todos los controles.

### 🟢 L6 — Scheduler multi-idioma: Timeout de 300s por script (no 120s)
- **Causa**: El procesamiento del canvas de Instagram y el upload de TikTok pueden tardar más de 2 minutos en conexiones lentas o con archivos grandes.
- **Regla**: El timeout de `execSync` por script en el scheduler debe ser **mínimo 300s (5 minutos)**.

### 🟢 L7 — Generación de imágenes: siempre pasar logo como `ImagePaths`
- **Causa**: Describir el logo de FairDraw solo con texto genera logos genéricos sin fidelidad a la marca.
- **Regla**: **SIEMPRE** pasar `C:\FairDraw\fairdraw-social\assets\logos\logo_real.png` como `ImagePaths` en `generate_image`. Agregar en el prompt `"no app store badges"`, `"no google play badges"`, y la posición exacta del logo.
