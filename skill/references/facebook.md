# Hyperion Module: Facebook Publishing Engine (Zero-Coordinates & Direct Injection)

Este módulo de subskill gobierna la publicación automática de **Reels**, **Álbumes de Fotos** y **Stories** en **Facebook** (`facebook.com`) utilizando el motor de inyección directa de archivos sin diálogos del sistema operativo y clics basados en coordenadas dinámicas extraídas en tiempo real del DOM.

---

## ⚠️ LECCIÓN CRÍTICA APRENDIDA: CDP en Windows usa `127.0.0.1`, NO `localhost`

En Windows, `localhost` se resuelve a la dirección IPv6 `::1`. Chrome Debug Protocol solo escucha en IPv4 (`127.0.0.1:9222`). Si usas `localhost`, recibirás `ECONNREFUSED` aunque Chrome esté corriendo correctamente.

```javascript
// ✅ CORRECTO
http.get('http://127.0.0.1:9222/json', ...)

// ❌ INCORRECTO en Windows — falla con ECONNREFUSED
http.get('http://localhost:9222/json', ...)
```

Esta regla aplica a **TODOS los scripts de Hyperion** (Instagram, TikTok, Facebook, Gemini).

---

## 🎯 Directiva de Inyección Directa (Bypass Completo del File Chooser)
- **NUNCA HAGAS CLIC EN LOS ELEMENTOS DE SUBIDA VISIBLES**: Los botones como "Upload", "Add photo/video" o "Crear historia con fotos" son wrappers visuales (`div` o `button`) que al recibir clics físicos de usuario pueden abrir el diálogo nativo del SO Windows, congelando el agente de fondo.
- **INYECCIÓN DIRECTA**: Facebook mantiene elementos ocultos `<input type="file">` en el DOM desde que carga la página. El flujo correcto es:
  1. Obtener el nodo raíz del documento con `DOM.getDocument`.
  2. Buscar el selector `'input[type="file"]'` con `DOM.querySelector`.
  3. Resolver su `backendNodeId` con `DOM.describeNode`.
  4. Inyectar el path del archivo directamente usando `DOM.setFileInputFiles({ backendNodeId, files: [...] })`.

---

## 🚀 Flujos de Automatización y Ejemplos de Código

### 1. Publicación de Reels (`reels/create`)
```javascript
// A. Navegar a Reels Create y esperar la carga (mínimo 6s de hidratación)
await cdpCall(ws, 'Runtime.evaluate', { expression: "window.location.href='https://www.facebook.com/reels/create'" });
await wait(6000);

// B. Inyectar el video directamente al input[type="file"] oculto
const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
const queryRes = await cdpCall(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId: queryRes.nodeId });
await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: nodeInfo.node.backendNodeId, files: [videoPath] });

// C. Esperar procesamiento del video (10-12s) hasta que "Next" esté habilitado
await wait(12000);

// D. Paso 1: Clic en "Next" (pantalla Upload -> Edit reel)
// Resolver dinámicamente o por coordenadas (ancho > 80px)
await cdpCall(ws, 'Runtime.evaluate', {
  expression: `(() => {
    const btns = Array.from(document.querySelectorAll('div[role="button"], button')).filter(e => {
      const txt = (e.textContent||'').trim().toLowerCase();
      const r = e.getBoundingClientRect();
      return (txt === 'next' || txt === 'siguiente') && r.width > 80;
    });
    if (btns.length > 0) btns[btns.length - 1].click();
  })()`
});
await wait(4000);

// E. Paso 2: Clic en "Next" (pantalla Edit reel -> Reel settings)
await cdpCall(ws, 'Runtime.evaluate', {
  expression: `(() => {
    const btns = Array.from(document.querySelectorAll('div[role="button"], button')).filter(e => {
      const txt = (e.textContent||'').trim().toLowerCase();
      const r = e.getBoundingClientRect();
      return (txt === 'next' || txt === 'siguiente') && r.width > 80;
    });
    if (btns.length > 0) btns[btns.length - 1].click();
  })()`
});
await wait(4000);

// F. Escribir descripción / caption y cerrar autocomplete con Escape
await cdpCall(ws, 'Runtime.evaluate', {
  expression: `(() => {
    const ed = document.querySelector('div[contenteditable="true"], textarea');
    if (ed) {
      ed.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, ${JSON.stringify(captionText)});
      ed.dispatchEvent(new Event('input', { bubbles: true }));
    }
  })()`
});
await wait(1000);
// Escape doble para cerrar modal de hashtags
await cdpCall(ws, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape' });
await cdpCall(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape' });
await wait(1000);

// G. ⚠️ CRÍTICO: "Add AI label" Toggle
// Facebook deshabilita / pone en gris el botón "Post" si detecta contenido IA hasta activar el toggle:
await cdpCall(ws, 'Runtime.evaluate', {
  expression: `(() => {
    const toggles = Array.from(document.querySelectorAll('input[type="checkbox"], div[role="switch"]'));
    if (toggles.length > 0) toggles[0].click();
  })()`
});
await wait(1000);

// H. Paso 3: Clic en el botón "Post" / "Publicar" (Botón azul derecho, NO "Save as draft" izquierdo)
// Botón izquierdo = "Save" (~x=143) | Botón derecho = "Post" (~x=315, color azul)
await cdpCall(ws, 'Runtime.evaluate', {
  expression: `(() => {
    const btns = Array.from(document.querySelectorAll('div[role="button"], button')).filter(e => {
      const txt = (e.textContent||'').trim().toLowerCase();
      const r = e.getBoundingClientRect();
      return (txt === 'post' || txt === 'publicar') && r.width > 0;
    });
    if (btns.length > 0) btns[btns.length - 1].click();
  })()`
});
await wait(20000);
```

### 2. Creación de Álbumes de Fotos (Perfil ➔ Photos ➔ Albums ➔ Create Album)
```javascript
// A. Clic dinámico en la pestaña "Photos" y subpestaña "Albums"
// B. Clic dinámico en "Create album" (x, y calculados con getBoundingClientRect)
// C. Escribir nombre del álbum usando execCommand en el input de texto:
await cdpCall(ws, 'Runtime.evaluate', {
  expression: `(() => {
    const inp = document.querySelector('input[type="text"]');
    inp.focus();
    document.execCommand('insertText', false, "FairDraw CGI Art");
  })()`
});
// D. Inyectar lote de imágenes directamente en el input[type="file"] oculto del formulario
// E. Hacer clic en "Post" (resolviendo el botón azul de publicar en tiempo real)
```

### 3. Publicación de Historias (Stories - Script Único de Producción)
Este script inyecta de forma directa 1 foto o 1 video (en proporción vertical móvil 9:16) y realiza el posteo en Facebook Stories de forma desatendida:

```javascript
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

async function publishFacebookStory(filePath) {
  if (!fs.existsSync(filePath)) throw new Error('Archivo no encontrado: ' + filePath);

  // ⚠️ CRÍTICO: Usar 127.0.0.1 (IPv4) — NO localhost (resuelve a ::1 IPv6 en Windows y causa ECONNREFUSED)
  const tabs = await new Promise((res) => {
    http.get('http://127.0.0.1:9222/json', r => {
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)));
    });
  });
  const tab = tabs.find(t => t.type === 'page' && t.url.includes('facebook.com'));
  if (!tab) throw new Error('No Facebook tab open');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));

  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // Navegación
  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.location.href='https://www.facebook.com/stories/create'" });
  await wait(6000);

  // Ubicar input[type="file"]
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const queryRes = await cdpCall(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId: queryRes.nodeId });
  const backendNodeId = nodeInfo.node.backendNodeId;

  // Inyección Directa (Mismo input para fotos o videos)
  await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId, files: [filePath] });
  
  // Esperar carga y previsualización (videos pueden tardar hasta 8-10s)
  await wait(filePath.toLowerCase().endsWith('.mp4') ? 10000 : 6000);

  // Resolver botón "Share to story"
  const shareCoords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const divs = Array.from(document.querySelectorAll('div, button'));
      const btn = divs.find(d => {
        const t = (d.textContent||'').trim();
        const r = d.getBoundingClientRect();
        return (t === 'Share to story' || t === 'Compartir en historia') && r.width > 100 && r.left < 400;
      });
      if (btn) {
        const r = btn.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });

  if (!shareCoords.result?.value) throw new Error('Botón Share to story no encontrado');
  const pc = JSON.parse(shareCoords.result.value);

  // Clic físico
  await mouseClick(ws, pc.x, pc.y);
  await wait(8000);
  ws.close();
}
```

---

## ⚠️ Manejo de Diálogos beforeunload (Reload site? Changes you made may not be saved)
Facebook y otros portales disparan este diálogo nativo de Chrome cuando hay un formulario en edición (como un post medio escribir) y se intenta recargar o navegar. Esto congela el agente.

### Ley #3 — Desplegable Autocompletar Hashtag (Escape obligado)
Al escribir la descripción con hashtags `#...`, Facebook abre un menú desplegable de sugerencias (ej: `#RedesSociales 9.5M posts`) que cubre el botón inferior `Publicar / Post`.
* **Solución OBLIGATORIA:** Enviar `Escape` con `Input.dispatchKeyEvent` después de escribir el texto para cerrar el menú desplegable antes de hacer clic en `Publicar`.

### Estrategia de Evasión Obligatoria:
1. **Preventiva (DOM)**: Antes de refrescar la página o navegar a otra sección, ejecuta preventivamente en Runtime:
   ```javascript
   await cdpCall(ws, 'Runtime.evaluate', { expression: "window.onbeforeunload = null;" });
   ```
2. **Reactiva (CDP)**: Configura un listener en tu WebSocket para diálogos nativos:
   ```javascript
   ws.on('message', async (data) => {
     try {
       const msg = JSON.parse(data);
       if (msg.method === 'Page.javascriptDialogOpening') {
         // Auto-aceptar confirmación nativa de recarga
         await cdpCall(ws, 'Page.handleJavaScriptDialog', { accept: true });
       }
     } catch (e) {}
   });
   ```

