/**
 * HYPERION v11 — Gemini Web Master Flow (PRODUCCIÓN)
 * 
 * REGLA MAESTRA DE ARCHIVOS:
 * 1. Page.setInterceptFileChooserDialog({ enabled: true }) — bloquea OS dialog
 * 2. Escuchar Page.fileChooserOpened ANTES del clic
 * 3. Simular .click() vía Runtime.evaluate (JS simulado, NO clic real CDP)
 * 4. Chrome intercepta → DOM.setFileInputFiles — sin ventana Windows JAMÁS
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');
const WebSocket = require('ws');

// ─── CDP Engine ─────────────────────────────────────────────────────────────
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

// ─── Capa Manus Dinámica ─────────────────────────────────────────────────────
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

// ─── Archivos ────────────────────────────────────────────────────────────────
const ART = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea';
const FILES = [
  path.join(ART, 'fairdraw_official_logo_1784899306001.png'),
  path.join(ART, 'fairdraw_hook_v2_1784905233658.png'),
  path.join(ART, 'fairdraw_core_v2_1784905267550.png'),
  path.join(ART, 'fairdraw_climax_v2_1784905302909.png'),
];
FILES.forEach(f => { if (!fs.existsSync(f)) throw new Error('No encontrado: ' + f); });

const PROMPT = "Animate these 4 uploaded promotional illustration images (Official FairDraw Logo, 3D Winner Hook, 3D AI Referee Core, and 3D Fictional Cartoon Characters winner celebration climax) into a high-energy 10-second vertical 9:16 promotional animation for FairDraw sweepstakes app. All images represent fictional 3D cartoon drawings, not real people. Show smooth transitions between the sweepstakes hook, 100% provably fair algorithm, and the final YOU WON cartoon celebration climax.";

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════');
  console.log('🚀 HYPERION v11 — Gemini Web Full Flow');
  console.log('═══════════════════════════════════════');

  // Conectar al tab de Gemini
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
  console.log('   ✅ Tab al frente.');

  console.log('   📢 Habilitando dominio Page para recibir eventos...');
  await cdpCall(ws, 'Page.enable');

  // Cerrar cualquier menú flotante previo para empezar limpios
  await cdpCall(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await wait(500);

  // PASO 0: Nueva conversación — evitar Page.navigate si ya estamos en Gemini (se cuelga)
  console.log('\n🆕 PASO 0: Nueva conversación...');
  const curUrl = await cdpCall(ws, 'Runtime.evaluate', { expression: 'location.href', returnByValue: true });
  const isGemini = (curUrl.result?.value||'').includes('gemini.google.com');
  if (isGemini) {
    console.log('   Ya en Gemini — haciendo click en Nueva conversación...');
    const newChat = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const links = Array.from(document.querySelectorAll('a,button'));
        const btn = links.find(e => (e.getAttribute('aria-label')||e.textContent||'').toLowerCase().includes('nueva conversaci'));
        if(btn){btn.click();return 'clicked';}
        window.location.href='https://gemini.google.com/u/1/app?hl=es';
        return 'navigated';
      })()`, returnByValue: true
    });
    console.log('   Resultado:', newChat.result?.value);
  } else {
    await cdpCall(ws, 'Page.navigate', { url: 'https://gemini.google.com/u/1/app?hl=es' });
  }

  // Esperar a que el input del chat se renderice (confirmación de carga)
  console.log('   ⏳ Esperando a que el editor de Gemini se monte en el DOM...');
  let editorLoaded = false;
  for (let i = 0; i < 20; i++) {
    const check = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `!!document.querySelector('div[contenteditable="true"], textarea, [role="textbox"]')`,
      returnByValue: true
    });
    if (check.result?.value) {
      editorLoaded = true;
      break;
    }
    await wait(500);
  }
  if (!editorLoaded) {
    console.log('   ❌ El editor de Gemini no cargó a tiempo. Abortando.');
    ws.close(); process.exit(1);
  }
  console.log('   ✅ Editor cargado. Esperando 3s para inicialización de handlers...');
  await wait(3000);

  // PASO 1: Capa Manus
  console.log('\n🎨 PASO 1: Capa Manus dinámica...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS });
  await wait(600);
  await screenshot(ws, 'v11_01_layer.png');

  // PASO 2: Habilitar interceptor CDP — ANTES de cualquier clic
  // Page.setInterceptFileChooserDialog bloquea la ventana nativa del SO
  console.log('\n🛡️  PASO 2: Interceptor CDP habilitado — bloquea ventana Windows...');
  await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: true });

  // Configurar comportamiento de descarga para evitar el diálogo "Guardar como" de Windows
  console.log('   📥 Configurando comportamiento de descargas automático...');
  await cdpCall(ws, 'Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: 'C:\\Users\\erick\\Downloads'
  });

  // Registrar listener ANTES de cualquier clic (sin race condition)
  const fileChooserPromise = new Promise((resolve, reject) => {
    const h = (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.method === 'Page.fileChooserOpened') {
          ws.removeListener('message', h);
          console.log('   🎯 ¡File chooser capturado! backendNodeId:', msg.params.backendNodeId);
          resolve(msg.params.backendNodeId);
        }
      } catch(e) { reject(e); }
    };
    ws.on('message', h);
    setTimeout(() => { ws.removeListener('message', h); reject(new Error('Timeout 10s sin fileChooserOpened')); }, 10000);
  });

  // PASO 3: Encontrar (+) por aria-label directo → coords del DOM → clic físico CDP
  console.log('\n📎 PASO 3: Leyendo coordenadas del botón (+) con JS...');
  const plusCoords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('button')).find(b => {
        const a = (b.getAttribute('aria-label')||'').toLowerCase();
        return a === 'subidas y herramientas' || a === 'uploads and tools' || a === 'upload and tools';
      });
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return JSON.stringify({ x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2), aria: b.getAttribute('aria-label') });
    })()`,
    returnByValue: true
  });

  if (!plusCoords.result?.value) {
    console.log('   ❌ Botón (+) no encontrado. Abortando.');
    ws.close(); process.exit(1);
  }
  const pc = JSON.parse(plusCoords.result.value);
  console.log(`   (+) aria="${pc.aria}" coords=(${pc.x}, ${pc.y}) — clic físico CDP`);
  await mouseClick(ws, pc.x, pc.y);
  await wait(1500);

  // PASO 4: Leer coordenadas de "Subir archivos" desde DOM → clic físico CDP
  console.log('\n🖱️  PASO 4: Leyendo coordenadas de "Subir archivos" con JS...');
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
            return JSON.stringify({x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)});
        }
        return null;
      })()`, returnByValue: true
    });
    if (upBtn.result?.value) { pUp = JSON.parse(upBtn.result.value); break; }
    console.log(`   ⏳ Intento ${attempt+1}/10 — esperando 500ms...`);
    await wait(500);
  }

  if (!pUp) {
    console.log('   ❌ "Subir archivos" no encontrado. Abortando.');
    ws.close(); process.exit(1);
  }
  console.log(`   "Subir archivos" coords=(${pUp.x}, ${pUp.y}) — clic físico CDP`);
  await mouseClick(ws, pUp.x, pUp.y);

  // PASO 5: Esperar interceptación e inyectar archivos
  try {
    const backendNodeId = await fileChooserPromise;
    console.log(`   ✅ Inyectando 4 archivos usando backendNodeId: ${backendNodeId}`);
    await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId, files: FILES });
    console.log('   ✅ 4 imágenes inyectadas. Ventana Windows nunca apareció.');
  } catch(e) {
    console.log('   ❌ Error:', e.message);
    ws.close(); process.exit(1);
  }
  // Mantenemos el interceptor habilitado permanentemente durante la sesión
  await wait(4000);
  await screenshot(ws, 'v11_05_thumbnails.png');

  // PASO 6: Escribir prompt
  console.log('\n✍️  PASO 6: Escribiendo prompt...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('div[contenteditable="true"],textarea,[role="textbox"]');
      if(ed){ed.focus();document.execCommand('selectAll',false,null);document.execCommand('insertText',false,${JSON.stringify(PROMPT)});ed.dispatchEvent(new Event('input',{bubbles:true}));return 'ok';}
      return 'no editor';
    })()`
  });
  await wait(800);

  // PASO 7: Enviar
  console.log('\n🚀 PASO 7: Enviando [aria="Enviar mensaje"]...');
  const sent = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('button')).find(b=>
        (b.getAttribute('aria-label')||'').trim()==='Enviar mensaje'||
        (b.getAttribute('aria-label')||'').trim()==='Send message');
      if(b){b.click();return 'enviado';}return 'not found';
    })()`, returnByValue: true
  });
  console.log('   Resultado:', sent.result?.value);
  await screenshot(ws, 'v11_07_sent.png');

  // PASO 8: Esperar generación (~90s) y descargar
  console.log('\n⏳ PASO 8: Esperando generación del video (~90s)...');
  await wait(90000);
  await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS });
  await wait(500);
  await screenshot(ws, 'v11_08_generated.png');

  const dlBtn = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('button,a')).find(b=>
        (b.getAttribute('aria-label')||'').trim()==='Descargar vídeo'||
        (b.getAttribute('aria-label')||'').trim()==='Download video');
      if(b){
        b.scrollIntoView({ block: 'center' });
        const r=b.getBoundingClientRect();
        return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)});
      }
      return null;
    })()`, returnByValue: true
  });
  if (dlBtn.result?.value) {
    const p = JSON.parse(dlBtn.result.value);
    console.log(`\n⬇️  Descargando en (${p.x}, ${p.y})...`);
    await mouseClick(ws, p.x, p.y);
    await wait(3000);
    await screenshot(ws, 'v11_09_downloaded.png');
  } else {
    console.log('\n⚠️  Botón de descarga no encontrado — video aún en generación.');
  }

  console.log('\n═══════════════════════════════════════');
  console.log('🎉 HYPERION v11 — COMPLETADO');
  console.log('═══════════════════════════════════════');
  ws.close();
}

main().catch(e => { console.error('❌ Error fatal:', e.message); process.exit(1); });
