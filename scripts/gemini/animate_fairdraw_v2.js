/**
 * HYPERION — Animate FairDraw v2 Images in Gemini Web
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');
const WebSocket = require('ws');

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

// Capa Manus
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
  window.__HY_INJECTED_BANNER = true;
})();`;

const ART = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea';
const FILES = [
  path.join(ART, 'fairdraw_storyboard_1_1785177902303.png'),
  path.join(ART, 'fairdraw_storyboard_2_1785177924996.png'),
  path.join(ART, 'fairdraw_storyboard_3_1785177945874.png')
];

// Verificamos que los archivos existan localmente
FILES.forEach(f => {
  if (!fs.existsSync(f)) {
    console.error(`❌ Archivo no encontrado: ${f}`);
    process.exit(1);
  }
});

const PROMPT = "Animate these 3 uploaded marketing storyboard images for FairDraw giveaway app. Generate a high-energy 10-second vertical 9:16 promotional video suitable for Instagram Reels and TikTok. The animation should smoothly transition between these scenes, showing a trusted provably fair system. Include energetic English voiceover narration and synced on-screen dynamic captions (burned-in subtitles). Keep the official FairDraw logo consistent throughout.";

async function main() {
  console.log('🚀 Iniciando flujo de animación de FairDraw en Gemini Web...');
  
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d='';
      r.on('data',c=>d+=c);
      r.on('end',()=>{ try { res(JSON.parse(d)); } catch(e) { rej(e); } });
    }).on('error',rej);
  });
  
  const tab = tabs.find(t => t.type==='page' && t.url.includes('gemini.google.com') && !t.url.includes('RotateCookies'));
  if (!tab) throw new Error('No se encontró la pestaña de Gemini Web');
  console.log('✅ Pestaña de Gemini Web detectada:', tab.url);

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.on('open', res);
    ws.on('error', rej);
  });
  console.log('✅ Conexión CDP establecida.');

  await cdpCall(ws, 'Page.bringToFront');
  await cdpCall(ws, 'Page.enable');
  await wait(1000);

  // Inyectar Manus para control visual
  await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS });
  console.log('✅ Capa Manus inyectada en pantalla.');

  // Configurar interceptación de file chooser
  await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: true });

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
    setTimeout(() => { ws.removeListener('message', h); reject(new Error('Timeout esperando fileChooserOpened')); }, 12000);
  });

  // Buscar el botón de subidas y herramientas (+)
  console.log('👇 Buscando coordenadas de (+) en el DOM...');
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

  if (!plusCoords.result?.value) {
    throw new Error('Botón (+) "Subidas y herramientas" no encontrado. ¿Está logueado y en la interfaz de chat?');
  }

  const pc = JSON.parse(plusCoords.result.value);
  console.log(`🎯 Coordenadas del botón (+): x=${pc.x}, y=${pc.y}. Clickeando...`);
  await mouseClick(ws, pc.x, pc.y);
  await wait(1500);

  // Buscar la opción "Subir archivos" en el menú flotante
  console.log('👇 Buscando botón "Subir archivos" en el menú popup...');
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

  if (!pUp) {
    throw new Error('"Subir archivos" no encontrado en el popup.');
  }

  console.log(`🎯 Coordenadas de "Subir archivos": x=${pUp.x}, y=${pUp.y}. Clickeando para disparar interceptor...`);
  await mouseClick(ws, pUp.x, pUp.y);

  // Recibir backendNodeId y setear archivos directamente por CDP
  console.log('⏳ Esperando interceptor de diálogo de archivos...');
  const backendNodeId = await fileChooserPromise;
  console.log(`✅ Diálogo de archivos interceptado. Node ID: ${backendNodeId}. Enviando archivos...`);

  await cdpCall(ws, 'DOM.setFileInputFiles', {
    backendNodeId,
    files: FILES
  });

  console.log('✅ Archivos inyectados con éxito. Deshabilitando interceptor y esperando subida...');
  await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: false });
  await wait(6000); // Darle 6 segundos para cargar las miniaturas

  // Escribir el prompt en el editor
  console.log('✍️ Escribiendo prompt en el editor de chat...');
  const written = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('div[contenteditable="true"], textarea');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(PROMPT)});
        ed.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });

  if (!written.result?.value) {
    throw new Error('No se pudo encontrar el editor de chat de Gemini.');
  }
  await wait(1000);

  // Hacer clic en Enviar
  console.log('🚀 Clickeando botón "Enviar mensaje"...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const sendBtn = buttons.find(b => {
        const aria = (b.getAttribute('aria-label') || '').toLowerCase().trim();
        return aria === 'enviar mensaje' || aria === 'send message' || aria === 'enviar' || aria === 'send';
      });
      if (sendBtn) { sendBtn.click(); return true; }
      return false;
    })()`
  });

  console.log('📊 Generación de video iniciada. Tomando captura de control en 5s...');
  await wait(5000);
  
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\g_js_prompt_escrito.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 Captura de progreso guardada en: g_js_prompt_escrito.png');

  ws.close();
  console.log('🎉 Script completado con éxito. Esperando que finalice la generación en segundo plano.');
}

main().catch(err => {
  console.error('❌ Error fatal en flujo de Gemini:', err);
});
