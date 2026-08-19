/**
 * HYPERION v11 — Facebook Stories Single Photo Publishing Script (PRODUCCIÓN)
 * 
 * Uso:
 *   node scripts/facebook/publish_story.js [ruta_de_imagen.jpg/png]
 * 
 * Estrategia de automatización robusta sin popups nativos del SO:
 * 1. Conexión WebSocket y navegación desatendida.
 * 2. Inyección directa del archivo de imagen en el input[type="file"] oculto (sin clics físicos).
 * 3. Espera de procesamiento de la historia y previsualización.
 * 4. Clic en "Share to story" mediante resolución dinámica de coordenadas.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Imagen por defecto si no se pasa por argumento
const DEFAULT_IMAGE = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\story_test_1_cropped.jpg';

let imagePath = process.argv[2] || DEFAULT_IMAGE;

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
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

// Capa Manus
const MANUS = `(function(){
  try{if(window.__HYT){clearInterval(window.__HYT);}document.querySelectorAll('.HYL,.HYS').forEach(e=>e.remove());}catch(e){}
  var s=document.createElement('style');s.className='HYS';
  s.textContent='.HYL{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 10px/12px monospace;color:#fff;text-shadow:0 0 3px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;}';
  document.head.appendChild(s);
  var C=[{f:'rgba(255,0,0,.4)',b:'#F00'},{f:'rgba(0,200,0,.4)',b:'#0C0'},{f:'rgba(0,100,255,.4)',b:'#06F'},{f:'rgba(200,200,0,.4)',b:'#CC0'}];
  function vis(){var w=window.innerWidth,h=window.innerHeight,sel='button,a,input,textarea,[role=\"button\"],[role=\"link\"],[contenteditable=\"true\"]',all=Array.from(document.querySelectorAll(sel)),r=[];
    for(var i=0;i<all.length;i++){try{var el=all[i],rc=el.getBoundingClientRect();if(rc.width<12||rc.height<12||rc.right<0||rc.bottom<0||rc.left>w||rc.top>h)continue;var cx=Math.round(rc.left+rc.width/2),cy=Math.round(rc.top+rc.height/2);var aria=el.getAttribute('aria-label')||el.getAttribute('title')||'';var txt=(aria||el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,22);if(!txt)continue;r.push({el:el,rc:rc,txt:txt,cx:cx,cy:cy});}catch(e){}}return r;}
  function render(){try{document.querySelectorAll('.HYL').forEach(e=>e.remove());var els=vis();var info=document.createElement('div');info.className='HYL';info.style.cssText='top:3px;left:50%;transform:translateX(-50%);padding:3px 10px;background:rgba(0,0,0,.85);border-radius:4px;font:bold 12px monospace;color:#0f0;border:1px solid #0f0;white-space:nowrap;';info.textContent='HYPERION STORIES ['+els.length+' | DINÁMICO 250ms]';document.body.appendChild(info);for(var i=0;i<els.length;i++){var e=els[i],c=C[i%C.length],d=document.createElement('div');d.className='HYL';d.style.cssText='left:'+e.rc.left+'px;top:'+e.rc.top+'px;width:'+e.rc.width+'px;height:'+e.rc.height+'px;background:'+c.f+';border:2px solid '+c.b+';';d.textContent='['+(i+1)+'] '+e.txt.slice(0,14);document.body.appendChild(d);}}catch(e){}}
  render(); window.__HYT=setInterval(render,250);
})();`;

async function main() {
  imagePath = path.resolve(imagePath);
  if (!fs.existsSync(imagePath)) {
    throw new Error('Imagen no encontrada en la ruta especificada: ' + imagePath);
  }

  console.log('\n═══════════════════════════════════════');
  console.log('🚀 HYPERION FACEBOOK STORIES — Creador');
  console.log('═══════════════════════════════════════');
  console.log('   🖼️  Imagen a subir:', imagePath);

  console.log('   🔍 Localizando tab de Facebook...');
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)));
    }).on('error', rej);
  });
  const tab = tabs.find(t => t.type === 'page' && t.url.includes('facebook.com'));
  if (!tab) throw new Error('No se encontró la pestaña de Facebook abierta.');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  console.log('   ✅ Conexión WebSocket establecida.');

  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // 1. Navegar a creación de Stories
  console.log('   🧭 Navegando a stories/create...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.location.href='https://www.facebook.com/stories/create'" });

  console.log('   ⏳ Esperando carga e hidratación del DOM (6s)...');
  await wait(6000);

  // Inyectar Manus
  await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS });

  // 2. Inyección Directa de la Imagen
  console.log('   Buscando input de subida de archivos...');
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const rootNodeId = doc.root.nodeId;

  const queryRes = await cdpCall(ws, 'DOM.querySelector', {
    nodeId: rootNodeId,
    selector: 'input[type="file"]'
  });

  if (!queryRes.nodeId) throw new Error('No se encontró el elemento input[type="file"] en la página.');
  
  const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId: queryRes.nodeId });
  const backendNodeId = nodeInfo.node.backendNodeId;

  console.log('   📤 Inyectando archivo para historia directamente vía CDP...');
  await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId, files: [imagePath] });
  console.log('   ✅ Archivo inyectado con éxito.');

  // Esperar carga y previsualización (videos requieren más tiempo de procesamiento)
  const isVideo = imagePath.toLowerCase().endsWith('.mp4');
  const waitTime = isVideo ? 10000 : 6000;
  console.log(`   ⏳ Esperando procesamiento de la historia (${waitTime / 1000}s)...`);
  await wait(waitTime);

  // 3. Hacer clic en "Share to story" (Compartir en historia)
  console.log('   🚀 Publicando Historia...');
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

  if (!shareCoords.result?.value) throw new Error('No se encontró el botón de compartir historia (Share to story)');
  const sc = JSON.parse(shareCoords.result.value);
  console.log(`   Clic en "Share to story" en coords: (${sc.x}, ${sc.y})`);
  await mouseClick(ws, sc.x, sc.y);

  console.log('   ⏳ Esperando confirmación final (6s)...');
  await wait(6000);

  // Tomar captura final
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('fb_story_published.png', Buffer.from(ss.data, 'base64'));
  console.log('   📸 fb_story_published.png');

  console.log('\n═══════════════════════════════════════');
  console.log('🎉 HISTORIA PUBLICADA CON ÉXITO');
  console.log('═══════════════════════════════════════');
  ws.close();
}

main().catch(e => { console.error('❌ Error en creación de historia:', e.message); process.exit(1); });
