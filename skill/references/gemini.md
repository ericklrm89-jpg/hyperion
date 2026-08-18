# Hyperion Module: Google Gemini Web Programmatic DOM Engine (Zero-Coordinates)

This module governs AI video generation, 3D storyboard upload, Shadow DOM piercing, prompt submission, and video download on **Google Gemini Web** (`gemini.google.com`) using **100% programmatic code mapping (ZERO pixel coordinates)** and sub-skill specifications.

---

## 🎯 Programmatic Control Mapping (`window.__HY_GEMINI`)

Hyperion injects `src/pages/gemini.ts` to map all Gemini Web controls dynamically across Shadow DOM roots:

1. **Upload Plus Button (`(+)`)**:
   - `window.__HY_GEMINI.getUploadPlusButton()`
   - Finds interactive elements with `aria-label` or `title` containing `subir`, `upload`, `añadir`, or `add`.

2. **Prompt Editor (`contenteditable`)**:
   - `window.__HY_GEMINI.getPromptEditor()`
   - Finds the active `div[contenteditable="true"]` container.

3. **Send Button (`Enviar mensaje`)**:
   - `window.__HY_GEMINI.getSendButton()`
   - Finds `<button aria-label="Enviar mensaje">` or `aria-label="Send message"`.

4. **Native File Input (`input[type="file"]`)**:
   - `window.__HY_GEMINI.getFileInput()`
   - Finds the deep `input[type="file"]` receptive node across Shadow DOM boundaries.

5. **Video Download Button (`Descargar vídeo`)**:
   - `window.__HY_GEMINI.getVideoDownloadButton()`
   - Finds player action buttons containing `descargar` or `download video`.

---

## 🛑 MANDATORY NATIVE FILE PICKER BYPASS DIRECTIVE
- **NEVER CLICK THE NATIVE PICKER MENU ITEM**: Clicking the "Subir archivos" menu option or dispatching a raw click event on elements that trigger the native operating system's file input will freeze execution by popping up the native Windows OS file picker dialog.
- **DIRECT CDP INJECTION**: Retrieve the deep `input[type="file"]` node from the page's Shadow DOM tree using `DOM.querySelector` with `{ pierce: true }`, then inject files directly using `DOM.setFileInputFiles` via CDP. This bypasses OS dialogs entirely.

---

## 📐 DYNAMIC MANUS LAYER OVERLAY DIRECTIVE
- **DYNAMIC REPAINT LOOP**: The visual Manus-style colored bounding boxes and numeric element badges must not be static. Hyperion must maintain a dynamic repaint loop (using `setInterval` or `requestAnimationFrame` at 250ms) to ensure overlays move fluidly when content scrolls, window sizes change, or dynamic menus rend## 🛑 ERRORES CONOCIDOS — PROHIBIDO REPETIR

### ❌ ERROR 1: Buscar (+) con aria `includes('subir')`
El botón (+) del chat NO tiene "subir" en su aria-label.  
El aria-label exacto del botón (+) de Gemini Web es: **`"Subidas y herramientas"`**

### ❌ ERROR 2: Clickear "Subir archivos" en el menú popup
**NUNCA hacer clic en la opción "Subir archivos"** del popup de herramientas. Hacer clic en esa opción dispara síncronamente el diálogo nativo del sistema operativo de Windows, lo que congela el proceso y requiere intervención manual.

### ✅ FLUJO CORRECTO Y VERIFICADO PARA SUBIR 4 IMÁGENES:

```
1. Habilitar la notificación del dominio Page: Page.enable
2. Habilitar la interceptación de diálogos nativos: Page.setInterceptFileChooserDialog({ enabled: true })
3. Escuchar el evento Page.fileChooserOpened
4. Click en (+) [aria-label="Subidas y herramientas"] → wait(1500ms)
5. Clic físico con coordenadas del DOM en "Subir archivos" del menú popup (x=720, y=415) → El diálogo se abre e inmediatamente se intercepta (bloquea la ventana de Windows nativa)
6. Inyectar imágenes con DOM.setFileInputFiles({ backendNodeId, files }) usando el ID de backend del evento directamente
7. Deshabilitar interceptor: Page.setInterceptFileChooserDialog({ enabled: false })
```

---

## 🚀 CÓDIGO DE PRODUCCIÓN PROBADO (ESTE CÓDIGO FUNCIONÓ PERFECTAMENTE)

### 1. Inyección de las 4 imágenes en Gemini Web (Bypass de Diálogos del SO)
```javascript
// A. Habilitar Page y la interceptación en CDP
await cdpCall(ws, 'Page.enable');
await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: true });

// B. Configurar promesa de escucha del evento ANTES de los clics para evitar race conditions
const fileChooserPromise = new Promise((resolve, reject) => {
  const handler = async (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.method === 'Page.fileChooserOpened') {
        ws.removeListener('message', handler);
        resolve(msg.params.backendNodeId);
      }
    } catch(e) { reject(e); }
  };
  ws.on('message', handler);
  setTimeout(() => { ws.removeListener('message', handler); reject(new Error('Timeout sin fileChooserOpened')); }, 10000);
});

// C. Leer coordenadas del botón (+) en tiempo real desde el DOM y ejecutar clic físico
const plusCoords = await cdpCall(ws, 'Runtime.evaluate', {
  expression: `(() => {
    const b = Array.from(document.querySelectorAll('button')).find(b => {
      const a = (b.getAttribute('aria-label')||'').toLowerCase();
      return a === 'subidas y herramientas' || a === 'uploads and tools' || a === 'upload and tools';
    });
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
  })()`,
  returnByValue: true
});
if (!plusCoords.result?.value) throw new Error('Botón (+) no encontrado en el DOM');
const pc = JSON.parse(plusCoords.result.value);

await mouseClick(ws, pc.x, pc.y);
await wait(1500); // Esperar a que el menú popup se dibuje

// D. Leer coordenadas del botón "Subir archivos" en tiempo real y hacer clic físico
let pUp = null;
for (let attempt = 0; attempt < 10; attempt++) {
  const upBtn = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button,[role="menuitem"],[role="option"]')).find(b => {
        const a = (b.getAttribute('aria-label')||'').toLowerCase();
        const t = (b.innerText||b.textContent||'').trim().toLowerCase();
        return a.startsWith('subir') || t === 'subir archivos' || t === 'upload files' || a.startsWith('upload files');
      });
      if (btn) {
        const r = btn.getBoundingClientRect();
        if (r.width > 0 && r.height > 0)
          return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });
  if (upBtn.result?.value) {
    pUp = JSON.parse(upBtn.result.value);
    break;
  }
  await wait(500);
}
if (!pUp) throw new Error('"Subir archivos" no encontrado en el menú popup');

await mouseClick(ws, pUp.x, pUp.y);

// E. Esperar la interceptación e inyectar archivos usando backendNodeId directamente
const backendNodeId = await fileChooserPromise;
await cdpCall(ws, 'DOM.setFileInputFiles', {
  backendNodeId,
  files: [logoPath, hookPath, corePath, climaxPath]
});
console.log('✅ Imágenes inyectadas y diálogo de Windows bloqueado.');
await wait(4000); // Esperar renderización de miniaturas
```


### 2. Escritura del prompt y envío
```javascript
// Escribir el prompt en el editor
const promptText = "Animate these 4 uploaded promotional images (Official FairDraw Logo, 3D Winner Hook, 3D AI Referee Core, 3D Friends Celebration Climax) into a high-energy 10-second vertical 9:16 promotional video for FairDraw online sweepstakes app. Show smooth transitions between the transparent sweepstakes hook, 100% provably fair algorithm, and the final YOU WON winner celebration climax.";
await cdpCall(ws, 'Runtime.evaluate', {
  expression: `
    (() => {
      const ed = document.querySelector('div[contenteditable="true"], textarea');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(promptText)});
        ed.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    })()
  `
});
await wait(1000);

// Clickea el botón Enviar mensaje
await cdpCall(ws, 'Runtime.evaluate', {
  expression: `
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const sendBtn = buttons.find(b => {
        const aria = (b.getAttribute('aria-label') || '').toLowerCase().trim();
        return aria === 'enviar mensaje' || aria === 'send message' || aria === 'enviar' || aria === 'send';
      });
      if (sendBtn) { sendBtn.click(); return 'clicked'; }
      return 'not found';
    })()
  `
});
```

### 3. Descarga del video generado (Bypass del diálogo "Guardar como" de Windows)
```javascript
// A. Configurar el comportamiento de descargas automático para evitar que se abra la ventana emergente de Windows
await cdpCall(ws, 'Page.setDownloadBehavior', {
  behavior: 'allow',
  downloadPath: 'C:\\Users\\erick\\Downloads'
});

// B. Buscar el botón "Descargar vídeo", hacer scroll para traerlo al viewport y calcular su posición física
const downloadBtnPos = await cdpCall(ws, 'Runtime.evaluate', {
  expression: `
    (() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const download = buttons.find(b => {
        const aria = (b.getAttribute('aria-label') || '').toLowerCase().trim();
        const txt = (b.innerText || b.textContent || '').toLowerCase().trim();
        return aria.includes('descargar') || aria.includes('download') || txt.includes('descargar') || txt.includes('download');
      });
      if (download) {
        download.scrollIntoView({ block: 'center' });
        const r = download.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()
  `,
  returnByValue: true
});

// C. Click mouse real CDP en las coordenadas calculadas
if (downloadBtnPos.result && downloadBtnPos.result.value) {
  const pos = JSON.parse(downloadBtnPos.result.value);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: pos.x, y: pos.y });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
}
```

---

## 📄 SCRIPT DE PRODUCCIÓN COMPLETO (`hyperion-v11-master-flow.js`)

A continuación se adjunta la implementación completa de referencia que maneja la inicialización, la sincronización por hidratación, el bypass de diálogo de archivos, la inyección del prompt sin bloqueos de seguridad, y la descarga dinámica de doble columna:

```javascript
/**
 * HYPERION v11 — Gemini Web Master Flow (PRODUCCIÓN)
 * 
 * REGLA MAESTRA DE ARCHIVOS:
 * 1. Page.setInterceptFileChooserDialog({ enabled: true }) — bloquea OS dialog
 * 2. Escuchar Page.fileChooserOpened ANTES del clic
 * 3. Simular clic real con coordenadas dinámicas obtenidas del DOM
 * 4. Chrome intercepta → DOM.setFileInputFiles — sin ventana Windows JAMÁS
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');
const WebSocket = require('ws');

// CDP Engine
let cdpId = 1;
function cdpCall(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = cdpId++;
    const h = (data) => {
      try {
        const r = JSON.parse(data);
        if (r.id === id) {
          ws.removeListener('message', h);
          r.error ? reject(new Error(JSON.stringify(r.error))) : resolve(r.result || {});
        }
      } catch(e) {}
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

async function mouseClick(ws, x, y) {
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await wait(60);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(60);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function screenshot(ws, name) {
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(name, Buffer.from(ss.data, 'base64'));
  console.log('   📸', name);
}

// Capa Manus Dinámica
const MANUS = `(function(){
  try{if(window.__HYT){clearInterval(window.__HYT);}document.querySelectorAll('.HYL,.HYS').forEach(e=>e.remove());}catch(e){}
  var s=document.createElement('style');s.className='HYS';
  s.textContent='.HYL{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 10px/12px monospace;color:#fff;text-shadow:0 0 3px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;}';
  document.head.appendChild(s);
  var C=[{f:'rgba(255,0,0,.4)',b:'#F00'},{f:'rgba(0,200,0,.4)',b:'#0C0'},{f:'rgba(0,100,255,.4)',b:'#06F'},{f:'rgba(200,200,0,.4)',b:'#CC0'},{f:'rgba(200,0,200,.4)',b:'#C0C'},{f:'rgba(0,200,200,.4)',b:'#0CC'}];
  function vis(){var w=window.innerWidth,h=window.innerHeight,sel='button,a,input,textarea,[role="button"],[role="menuitem"],[contenteditable="true"]',all=Array.from(document.querySelectorAll(sel)),r=[];
    for(var i=0;i<all.length;i++){try{var el=all[i],rc=el.getBoundingClientRect();if(rc.width<12||rc.height<12||rc.right<0||rc.bottom<0||rc.left>w||rc.top>h)continue;var cx=Math.round(rc.left+rc.width/2),cy=Math.round(rc.top+rc.height/2);var aria=el.getAttribute('aria-label')||el.getAttribute('title')||'';var txt=(aria||el.textContent||'').replace(/\s+/g,' ').trim().slice(0,22);if(!txt)continue;r.push({el:el,rc:rc,txt:txt,cx:cx,cy:cy});}catch(e){}}return r;}
  function render(){try{document.querySelectorAll('.HYL').forEach(e=>e.remove());var els=vis();var info=document.createElement('div');info.className='HYL';info.style.cssText='top:3px;left:50%;transform:translateX(-50%);padding:3px 10px;background:rgba(0,0,0,.85);border-radius:4px;font:bold 12px monospace;color:#0f0;border:1px solid #0f0;white-space:nowrap;';info.textContent='HYPERION v11 ['+els.length+' | DINÁMICO 250ms]';document.body.appendChild(info);for(var i=0;i<els.length;i++){var e=els[i],c=C[i%C.length],d=document.createElement('div');d.className='HYL';d.style.cssText='left:'+e.rc.left+'px;top:'+e.rc.top+'px;width:'+e.rc.width+'px;height:'+e.rc.height+'px;background:'+c.f+';border:2px solid '+c.b+';';d.textContent='['+(i+1)+'] '+e.txt.slice(0,14);document.body.appendChild(d);}}catch(e){}}
  render(); window.__HYT=setInterval(render,250);
  window.addEventListener('resize',render); window.addEventListener('scroll',render,{passive:true});
})();`;

const ART = 'C:\\\\Users\\\\erick\\\\.gemini\\\\antigravity-ide\\\\brain\\\\a24ce018-a2c0-4cb7-905d-2c0a339916ea';
const FILES = [
  path.join(ART, 'fairdraw_official_logo_1784899306001.png'),
  path.join(ART, 'fairdraw_hook_v2_1784905233658.png'),
  path.join(ART, 'fairdraw_core_v2_1784905267550.png'),
  path.join(ART, 'fairdraw_climax_v2_1784905302909.png'),
];

const PROMPT = "Animate these 4 uploaded promotional illustration images (Official FairDraw Logo, 3D Winner Hook, 3D AI Referee Core, and 3D Fictional Cartoon Characters winner celebration climax) into a high-energy 10-second vertical 9:16 promotional animation for FairDraw sweepstakes app. The output video MUST include dynamic visible on-screen subtitles (burned-in captions) and a high-energy promotional English voiceover narration. Show smooth transitions between the sweepstakes hook, 100% provably fair algorithm, and the final YOU WON cartoon celebration climax.";

async function main() {
  console.log('\\n═══════════════════════════════════════');
  console.log('🚀 HYPERION v11 — Gemini Web Full Flow');
  console.log('═══════════════════════════════════════');

  console.log('   🔍 Obteniendo tabs de Chrome...');
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d='';
      r.on('data',c=>d+=c);
      r.on('end',()=>{
        try { res(JSON.parse(d)); } catch(e) { rej(e); }
      });
    }).on('error',rej);
  });
  const tab = tabs.find(t => t.type==='page' && t.url.includes('gemini.google.com') && !t.url.includes('RotateCookies'));
  if (!tab) throw new Error('No tab de Gemini encontrado');
  console.log('   ✅ Tab encontrado:', tab.url.slice(0, 60));

  console.log('   🔌 Conectando WebSocket a CDP...');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.on('open', () => { console.log('   ✅ WebSocket abierto.'); resolve(); });
    ws.on('error', (e) => { console.log('   ❌ WebSocket error:', e.message); reject(e); });
  });
  
  console.log('   🖥️  Trayendo tab al frente...');
  await cdpCall(ws, 'Page.bringToFront');

  console.log('   📢 Habilitando dominio Page para recibir eventos...');
  await cdpCall(ws, 'Page.enable');

  // Nueva conversación con espera de hidratación de Angular
  console.log('\\n🆕 PASO 0: Nueva conversación...');
  const curUrl = await cdpCall(ws, 'Runtime.evaluate', { expression: 'location.href', returnByValue: true });
  if ((curUrl.result?.value||'').includes('gemini.google.com')) {
    await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const links = Array.from(document.querySelectorAll('a,button'));
        const btn = links.find(e => (e.getAttribute('aria-label')||e.textContent||'').toLowerCase().includes('nueva conversaci'));
        if(btn){btn.click();return 'clicked';}
        window.location.href='https://gemini.google.com/u/1/app?hl=es';
      })()`
    });
  }

  console.log('   ⏳ Esperando a que el editor de Gemini se monte en el DOM...');
  let editorLoaded = false;
  for (let i = 0; i < 20; i++) {
    const check = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `!!document.querySelector('div[contenteditable="true"], textarea')`
    });
    if (check.result?.value) { editorLoaded = true; break; }
    await wait(500);
  }
  if (!editorLoaded) throw new Error('El editor no cargó a tiempo');
  console.log('   ✅ Editor cargado. Esperando 3s para inicialización de handlers...');
  await wait(3000);

  // Inyectar Manus
  await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS });
  await wait(600);

  // Habilitar interceptación de subidas y descargas automáticas
  await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: true });
  await cdpCall(ws, 'Page.setDownloadBehavior', { behavior: 'allow', downloadPath: 'C:\\\\Users\\\\erick\\\\Downloads' });

  // Escuchar file chooser ANTES del clic
  const fileChooserPromise = new Promise((resolve, reject) => {
    const h = (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.method === 'Page.fileChooserOpened') {
          ws.removeListener('message', h);
          resolve(msg.params.backendNodeId);
        }
      } catch(e) { reject(e); }
    };
    ws.on('message', h);
    setTimeout(() => { ws.removeListener('message', h); reject(new Error('Timeout fileChooser')); }, 10000);
  });

  // Clic en (+) buscando dinámicamente sus coordenadas en el DOM
  const plusCoords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('button')).find(b => {
        const a = (b.getAttribute('aria-label')||'').toLowerCase();
        return a === 'subidas y herramientas' || a === 'uploads and tools';
      });
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return JSON.stringify({ x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2) });
    })()`,
    returnByValue: true
  });
  const pc = JSON.parse(plusCoords.result.value);
  await mouseClick(ws, pc.x, pc.y);
  await wait(1500);

  // Clic en "Subir archivos" buscando dinámicamente sus coordenadas en el DOM
  let pUp = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    const upBtn = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button,[role="menuitem"],[role="option"]')).find(b => {
          const a = (b.getAttribute('aria-label')||'').toLowerCase();
          const t = (b.innerText||b.textContent||'').trim().toLowerCase();
          return a.startsWith('subir') || t === 'subir archivos' || t === 'upload files';
        });
        if (btn) {
          const r = btn.getBoundingClientRect();
          return JSON.stringify({ x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2) });
        }
        return null;
      })()`, returnByValue: true
    });
    if (upBtn.result?.value) { pUp = JSON.parse(upBtn.result.value); break; }
    await wait(500);
  }
  await mouseClick(ws, pUp.x, pUp.y);

  // Inyectar archivos
  const backendNodeId = await fileChooserPromise;
  await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId, files: FILES });
  await wait(4000);

  // Escribir y enviar prompt
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('div[contenteditable="true"],textarea');
      ed.focus();
      document.execCommand('selectAll',false,null);
      document.execCommand('insertText',false,${JSON.stringify(PROMPT)});
      ed.dispatchEvent(new Event('input',{bubbles:true}));
    })()`
  });
  await wait(800);

  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('button')).find(b=> {
        const a = (b.getAttribute('aria-label')||'').trim().toLowerCase();
        return a === 'enviar mensaje' || a === 'send message';
      });
      if(b) b.click();
    })()`
  });

  // Esperar generación de video y descargar dinámicamente (soporta 1 o 2 columnas)
  console.log('   ⏳ Esperando generación del video (90s)...');
  await wait(90000);

  const dlBtn = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('button,a')).find(b=> {
        const a = (b.getAttribute('aria-label')||'').trim().toLowerCase();
        return a === 'descargar vídeo' || a === 'download video';
      });
      if(b){
        b.scrollIntoView({ block: 'center' });
        const r=b.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2) });
      }
      return null;
    })()`, returnByValue: true
  });
  if (dlBtn.result?.value) {
    const p = JSON.parse(dlBtn.result.value);
    await mouseClick(ws, p.x, p.y);
    await wait(3000);
    console.log('   ✅ Video descargado en Downloads.');
  }

  ws.close();
}
main();
```



