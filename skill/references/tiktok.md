# Hyperion Module: TikTok Studio Upload, Privacy & Deletion Engine

Este módulo de subskill gobierna la publicación de videos, la configuración de privacidad y el borrado en lote de videos en **TikTok Studio** (`tiktok.com/tiktokstudio`).

---

## 🎯 Directiva de Interacción en TikTok Studio

El panel de TikTok Studio se comporta como una SPA virtualizada. Las filas de la tabla de contenido pueden no compartir clases estándar o IDs persistentes de base de datos:

- **Selector del Botón de Opciones (3 puntos)**: Los botones de tres puntos de cada fila en la tabla de contenido se encuentran en la columna de acciones del extremo derecho. Se pueden localizar filtrando todos los botones cuya coordenada horizontal `left` sea mayor a 1300 píxeles:
  `const btns = Array.from(document.querySelectorAll('button')).filter(b => b.getBoundingClientRect().left > 1300);`
- **Bypass de beforeunload**: TikTok Studio interrumpe la navegación del navegador si hay algún proceso pendiente o al recargar la página. Elimina siempre este manejador antes de redireccionar:
  `window.onbeforeunload = null;`

---

## ⚠️ MODALES CRÍTICOS DE TIKTOK STUDIO (REGLAS OBLIGATORIAS)

### 1. Borrador Pendiente ("Descartar")
Si TikTok muestra el banner: `Un vídeo que estabas editando no se ha guardado. ¿Quieres seguir editándolo? [Descartar]`
* **Acción:** Hacer clic en `Descartar` antes de inyectar el nuevo archivo.

### 2. Confirmación de Publicación ("Publicar ahora")
Después de hacer clic en `Publicar`, TikTok Studio muestra el modal:
`¿Seguir con la publicación? Seguimos revisando tu vídeo para detectar posibles problemas. ¿Quieres seguir con la publicación antes de finalizar la revisión? [Cancelar] [Publicar ahora]`
* **Acción OBLIGATORIA:** Hacer clic en `Publicar ahora` inmediatamente después del primer clic en Publicar. Sin este segundo clic, el vídeo NO se publica.

---

## ⚠️ LECCIÓN CRÍTICA APRENDIDA: Error "Could not find node with given id"

> Este error es la trampa más común en TikTok Studio. Ocurre cuando se llama a `DOM.setFileInputFiles` con un `nodeId` que fue obtenido **sin usar `pierce: true`** en el `DOM.getDocument`.

### Causa
TikTok Studio renderiza sus formularios de upload dentro de **Shadow DOM** o iframes anidados. Un `DOM.getDocument` simple (sin `{ depth: -1, pierce: true }`) solo ve el árbol superficial. El `nodeId` retornado pertenece al árbol superficial, no al nodo real del Shadow DOM, por lo que cuando Chrome intenta usarlo para `setFileInputFiles`, el nodo ya no existe en ese contexto y lanza el error `-32000`.

### Solución Obligatoria (SIEMPRE)
```javascript
// ✅ CORRECTO — siempre usar querySelectorAll + backendNodeId
const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
const fileInputs = await cdpCall(ws, 'DOM.querySelectorAll', {
  nodeId: doc.root.nodeId,
  selector: 'input[type="file"]'
});
// Resolver backendNodeId por cada nodeId encontrado
const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId: fileInputs.nodeIds[0] });
const backendNodeId = nodeInfo.node.backendNodeId;
await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId, files: [VIDEO_PATH] });

// ❌ INCORRECTO — da error -32000 si el input está en Shadow DOM
const doc = await cdpCall(ws, 'DOM.getDocument');
const node = await cdpCall(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
await cdpCall(ws, 'DOM.setFileInputFiles', { nodeId: node.nodeId, files: [VIDEO_PATH] });
```

### Por qué usar `querySelectorAll` y no `querySelector`
`querySelector` devuelve solo el primer `nodeId` sin perforar Shadow DOM, aunque se pase `pierce: true`. `querySelectorAll` con `pierce: true` activo en `getDocument` sí retorna todos los nodos incluyendo los anidados en Shadow DOM.

---

## 🚀 Flujo de Publicación de Video (Template de Producción)

```javascript
const VIDEO = 'C:\\ruta\\al\\video.mp4';
const CAPTION = 'Tu caption aquí #hashtags';

// STEP 0: Navegar y limpiar beforeunload
await cdpCall(ws, 'Runtime.evaluate', { expression: "window.onbeforeunload = null;" });
await cdpCall(ws, 'Runtime.evaluate', { expression: "window.location.href='https://www.tiktok.com/tiktokstudio/upload';" });
await wait(8000); // Esperar hidratación React

// STEP 1: Inyección directa con pierce (técnica correcta)
await cdpCall(ws, 'DOM.enable');
const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
const fileInputs = await cdpCall(ws, 'DOM.querySelectorAll', {
  nodeId: doc.root.nodeId,
  selector: 'input[type="file"]'
});
if (!fileInputs.nodeIds || fileInputs.nodeIds.length === 0) throw new Error('No input[type="file"] found');
const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId: fileInputs.nodeIds[0] });
await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: nodeInfo.node.backendNodeId, files: [VIDEO] });
await wait(12000); // Esperar upload y preview del canvas

// STEP 2: Inyectar caption
await cdpCall(ws, 'Runtime.evaluate', {
  expression: `(() => {
    const ed = document.querySelector('div[contenteditable="true"], textarea');
    if (ed) {
      ed.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, ${JSON.stringify(CAPTION)});
      ed.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  })()`
});
await wait(2000);

// STEP 3: Resolver botón Post/Publicar dinámicamente
const postBtn = await cdpCall(ws, 'Runtime.evaluate', {
  expression: `(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(e => {
      const txt = (e.textContent || '').trim().toLowerCase();
      const r = e.getBoundingClientRect();
      return (txt === 'post' || txt === 'publicar' || txt === 'postar') && r.width > 0;
    });
    if (btn) {
      btn.scrollIntoView({ block: 'center' });
      const r = btn.getBoundingClientRect();
      return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
    }
    return null;
  })()`, returnByValue: true
});
if (postBtn.result?.value) {
  const p = JSON.parse(postBtn.result.value);
  await mouseClick(ws, p.x, p.y);
  await wait(6000);
}
```

---

## 🗑️ Borrado en Lote de Videos

```javascript
// A. Evasión de popup de salida
await cdpCall(ws, 'Runtime.evaluate', { expression: `window.onbeforeunload = null;` });

// B. Localizar el botón de 3 puntos de la primera fila (columna de acciones, left > 1300)
const optionsBtn = await cdpCall(ws, 'Runtime.evaluate', {
  expression: `(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.left > 1300 && r.top > 200;
    });
    if (btns.length > 0) {
      const r = btns[0].getBoundingClientRect();
      return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
    }
    return null;
  })()`,
  returnByValue: true
});

if (optionsBtn.result.value) {
  const oc = JSON.parse(optionsBtn.result.value);
  await mouseClick(ws, oc.x, oc.y);
  await wait(2500);

  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const els = Array.from(document.querySelectorAll('button, div[role="button"], li, span, a, p'));
      const del = els.find(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        return (txt === 'eliminar' || txt === 'delete') && e.getBoundingClientRect().width > 0;
      });
      if (del) del.click();
    })()`
  });
  await wait(2500);

  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
      const confirm = btns.find(b => {
        const txt = b.textContent.trim().toLowerCase();
        return txt === 'eliminar' || txt === 'confirmar' || txt === 'delete' || txt === 'confirm';
      });
      if (confirm) confirm.click();
    })()`
  });
  await wait(5000);
}
```
