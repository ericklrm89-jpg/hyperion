# Hyperion Module: Instagram Reels & Posts Engine (Zero-Coordinates & Batch Deletion)

Este módulo de subskill gobierna la publicación, el borrado en lote de posts, y la actualización de foto de perfil en **Instagram** (`instagram.com`) utilizando clics DOM nativos y bypasses CDP.

---

## 🎯 Directiva de Interacción DOM Nativa
Instagram implementa interfaces reactivas altamente dinámicas basadas en React y Virtual DOM:
- **No uses clics físicos estáticos**: El lightbox de posts y los menús flotantes cambian de tamaño y posición según el scroll. Realiza siempre clics nativos llamando a `element.click()` a través de `Runtime.evaluate` para asegurar una interactividad 100% inmune a cambios de escala.
- **Selector de Opciones en Lightbox**: El botón de los tres puntos (`...`) del post abierto en lightbox **no es un tag button nativo** en algunas interfaces. Es un elemento interactivo `div` o `svg` con el aria-label exacto de opciones:
  `document.querySelector('[aria-label="Más opciones"], [aria-label="More options"]')`

---

## 🚀 Flujos de Automatización y Ejemplos de Código

### 1. Borrado de Publicaciones en Lote (Batch Deletion)
Este script navega al perfil, realiza clics DOM secuenciales para abrir y borrar los posts en lightbox uno por uno de forma 100% limpia:

```javascript
// A. Desplazar página para centrar primer post
await cdpCall(ws, 'Runtime.evaluate', { expression: "window.scrollTo(0, 450);" });
await wait(1500);

// B. Clic nativo en el primer post del DOM
const clickRes = await cdpCall(ws, 'Runtime.evaluate', {
  expression: `(() => {
    const links = Array.from(document.querySelectorAll('a')).filter(a => {
      const href = a.getAttribute('href') || '';
      return href.includes('/p/') || href.includes('/reel/');
    });
    const first = links.find(a => a.getBoundingClientRect().width > 0);
    if (first) {
      first.click();
      return 'opened';
    }
    return 'none';
  })()`,
  returnByValue: true
});

if (clickRes.result.value === 'opened') {
  await wait(5000); // Esperar que cargue lightbox

  // C. Clic nativo DOM en el botón de opciones (3 puntos)
  // EVITA clics por coordenadas físicas aquí, ya que el scroll de la modal puede desplazar el botón fuera de pantalla
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector('[aria-label="Más opciones"], [aria-label="More options"]') ||
                 document.querySelector('svg[aria-label="Más opciones"]') ||
                 document.querySelector('svg[aria-label="More options"]') ||
                 document.querySelector('div[role="button"] svg[aria-label*="option"]');
      if (el) {
        if (el.tagName === 'svg') {
          const parent = el.parentElement;
          if (parent && (parent.tagName === 'BUTTON' || parent.getAttribute('role') === 'button')) {
            parent.click();
            return;
          }
        }
        el.click();
      }
    })()`
  });
  await wait(3000);

  // D. Seleccionar "Eliminar" en el menú
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const del = Array.from(document.querySelectorAll('button, span')).find(e => {
        const txt = (e.textContent||'').trim().toLowerCase();
        return txt === 'eliminar' || txt === 'delete';
      });
      if (del) del.click();
    })()`
  });
  await wait(3000);

  // E. Confirmar en el diálogo rojo
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const confirm = Array.from(document.querySelectorAll('button')).find(e => {
        const txt = (e.textContent||'').trim().toLowerCase();
        return (txt === 'eliminar' || txt === 'delete') && e.classList.contains('_a9-_');
      });
      if (confirm) confirm.click();
    })()`
  });
  await wait(6000); // Esperar procesamiento
}
```

### 2. Actualización de Foto de Perfil (Avatar Change)
Para subir la foto de perfil en Instagram, navegamos a la página de edición y usamos el input file de forma nativa:

```javascript
// A. Navegar a edición de perfil
await cdpCall(ws, 'Runtime.evaluate', { expression: "window.location.href='https://www.instagram.com/accounts/edit/'" });
await wait(7000);

// B. Obtener el input file en el DOM e inyectar el archivo de imagen
const doc = await cdpCall(ws, 'DOM.getDocument');
const node = await cdpCall(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });

if (node && node.nodeId) {
  await cdpCall(ws, 'DOM.setFileInputFiles', {
    nodeId: node.nodeId,
    files: ['C:\\FairDraw\\fairdraw-social\\assets\\logos\\logo_real.png']
  });
  await wait(8000); // Esperar que guarde
}
```

---

## 📐 Regla de Formato Físico de Medios (FFmpeg)
Cuando subas videos verticales `9:16` a través de Instagram de escritorio, para evitar que la interfaz los recorte a un cuadrado `1:1` tosco, **pre-formatea físicamente el archivo de video** a la relación `4:5` vertical (`1080x1350`) o `1:1` cuadrado agregando barras negras laterales (letterbox/padding) mediante FFmpeg antes de iniciar la subida:

```bash
# Convertir 9:16 (720x1280) a 4:5 vertical (1080x1350) con barras negras laterales
ffmpeg -y -i input.mp4 -vf "scale=760:1350,pad=1080:1350:(ow-iw)/2:(oh-ih)/2:black" -c:a copy output_4_5.mp4
```
Esto garantiza que la interfaz de Instagram Web mantenga el visor completo sin recortar textos ni logos, garantizando un resultado visual 100% premium en el perfil.
