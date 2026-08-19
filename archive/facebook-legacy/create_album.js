/**
 * HYPERION v11 — Facebook Album Creation Engine (PRODUCCIÓN)
 * 
 * Estrategia de automatización robusta sin popups nativos del SO:
 * 1. Navegación al perfil y clics dinámicos a "Photos" ➔ "Albums" ➔ "Create Album".
 * 2. Tipeado dinámico del nombre del álbum en el input de texto.
 * 3. Inyección directa del lote de imágenes en el input[type="file"] oculto.
 * 4. Publicación final del álbum mediante clic en "Post".
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const ART = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea';
const IMAGES = [
  path.join(ART, 'fairdraw_official_logo_1784899306001.png'),
  path.join(ART, 'fairdraw_hook_v2_1784905233658.png'),
  path.join(ART, 'fairdraw_core_v2_1784905267550.png'),
  path.join(ART, 'fairdraw_climax_v2_1784905302909.png'),
];
const ALBUM_NAME = 'FairDraw Official CGI Storyboards & Art';

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
  function vis(){var w=window.innerWidth,h=window.innerHeight,sel='button,a,input,textarea,[role=\"button\"],[role=\"link\"],[role=\"tab\"],[contenteditable=\"true\"]',all=Array.from(document.querySelectorAll(sel)),r=[];
    for(var i=0;i<all.length;i++){try{var el=all[i],rc=el.getBoundingClientRect();if(rc.width<12||rc.height<12||rc.right<0||rc.bottom<0||rc.left>w||rc.top>h)continue;var cx=Math.round(rc.left+rc.width/2),cy=Math.round(rc.top+rc.height/2);var aria=el.getAttribute('aria-label')||el.getAttribute('title')||'';var txt=(aria||el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,22);if(!txt)continue;r.push({el:el,rc:rc,txt:txt,cx:cx,cy:cy});}catch(e){}}return r;}
  function render(){try{document.querySelectorAll('.HYL').forEach(e=>e.remove());var els=vis();var info=document.createElement('div');info.className='HYL';info.style.cssText='top:3px;left:50%;transform:translateX(-50%);padding:3px 10px;background:rgba(0,0,0,.85);border-radius:4px;font:bold 12px monospace;color:#0f0;border:1px solid #0f0;white-space:nowrap;';info.textContent='HYPERION ALBUMS ['+els.length+' | DINÁMICO 250ms]';document.body.appendChild(info);for(var i=0;i<els.length;i++){var e=els[i],c=C[i%C.length],d=document.createElement('div');d.className='HYL';d.style.cssText='left:'+e.rc.left+'px;top:'+e.rc.top+'px;width:'+e.rc.width+'px;height:'+e.rc.height+'px;background:'+c.f+';border:2px solid '+c.b+';';d.textContent='['+(i+1)+'] '+e.txt.slice(0,14);document.body.appendChild(d);}}catch(e){}}
  render(); window.__HYT=setInterval(render,250);
})();`;

async function main() {
  IMAGES.forEach(f => { if (!fs.existsSync(f)) throw new Error('Imagen no encontrada: ' + f); });

  console.log('\n═══════════════════════════════════════');
  console.log('🚀 HYPERION FACEBOOK ALBUMS — Creador');
  console.log('═══════════════════════════════════════');

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

  // Comprobar si ya estamos en la pantalla de creación de álbumes
  const checkState = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const h = window.location.href;
      const isCreate = h.includes('albums') || h.includes('photos') || document.querySelector('input[placeholder="Album name"]') || Array.from(document.querySelectorAll('div')).some(d => d.textContent === 'Create album');
      return !!document.querySelector('input[type="text"]');
    })()`,
    returnByValue: true
  });

  if (checkState.result?.value) {
    console.log('   📍 Ya estamos en la pantalla de creación de álbumes. Omitiendo navegación.');
  } else {
    // 1. Navegar al perfil
    console.log('   🧭 Navegando al perfil...');
    await cdpCall(ws, 'Page.navigate', { url: 'https://www.facebook.com/profile.php?id=61590067290511' });
    await wait(6000);

    // Inyectar Manus
    await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS });

    // 2. Click en Photos
    console.log('   🖱️  Navegando a la pestaña "Photos"...');
    const photosTab = await getElementCoordsByText(ws, ['photos', 'fotos']);
    await mouseClick(ws, photosTab.x, photosTab.y);
    await wait(4000);

    // 3. Click en Albums
    console.log('   🖱️  Abriendo la sección "Albums"...');
    const albumsTab = await getElementCoordsByText(ws, ['albums', 'álbumes']);
    await mouseClick(ws, albumsTab.x, albumsTab.y);
    await wait(3000);

    // 4. Click en Create Album
    console.log('   🖱️  Iniciando creación de nuevo álbum...');
    const createAlbum = await getElementCoordsByText(ws, ['create album', 'crear álbum', 'crear album']);
    await mouseClick(ws, createAlbum.x, createAlbum.y);
    await wait(5000);
  }

  // Inyectar Manus por si no estaba
  await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS });

  // 5. Tipear nombre del álbum
  console.log('   ✍️  Escribiendo nombre del álbum...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      // Buscar el input del nombre del álbum
      const inp = document.querySelector('input[type="text"]');
      if (inp) {
        inp.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(ALBUM_NAME)});
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        return 'written';
      }
      return 'not found';
    })()`
  });
  await wait(800);

  // 6. Inyectar imágenes directamente
  console.log('   📤 Inyectando lote de 4 imágenes directamente vía CDP...');
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const rootNodeId = doc.root.nodeId;

  const queryRes = await cdpCall(ws, 'DOM.querySelector', {
    nodeId: rootNodeId,
    selector: 'input[type="file"]'
  });

  if (!queryRes.nodeId) throw new Error('No se encontró el elemento input[type="file"] en el formulario');

  const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId: queryRes.nodeId });
  const backendNodeId = nodeInfo.node.backendNodeId;

  await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId, files: IMAGES });
  console.log('   ✅ Imágenes inyectadas con éxito.');

  // Esperar a que carguen las fotos
  console.log('   ⏳ Esperando renderizado de fotos (8s)...');
  await wait(8000);

  // 7. Clic en "Post" (Publicar)
  console.log('   🚀 Publicando álbum...');
  const postCoords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const divs = Array.from(document.querySelectorAll('div, button'));
      const btn = divs.find(d => {
        const t = (d.textContent||'').trim();
        const r = d.getBoundingClientRect();
        return (t === 'Post' || t === 'Publicar') && r.width > 100 && r.top > 800;
      });
      if (btn) {
        const r = btn.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });

  if (!postCoords.result?.value) throw new Error('No se encontró el botón de publicar (Post)');
  const pc = JSON.parse(postCoords.result.value);
  console.log(`   Clic en "Post" en coords: (${pc.x}, ${pc.y})`);
  await mouseClick(ws, pc.x, pc.y);

  console.log('   ⏳ Esperando confirmación final (6s)...');
  await wait(6000);

  // Tomar captura final
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('fb_album_published.png', Buffer.from(ss.data, 'base64'));
  console.log('   📸 fb_album_published.png');

  console.log('\n═══════════════════════════════════════');
  console.log('🎉 ÁLBUM CREADO CON ÉXITO');
  console.log('═══════════════════════════════════════');
  ws.close();
}

async function getElementCoordsByText(ws, keywords) {
  const result = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const els = Array.from(document.querySelectorAll('button, a, [role="button"], [role="tab"], div'));
      const found = els.find(e => {
        const t = (e.textContent||'').trim().toLowerCase();
        const a = (e.getAttribute('aria-label')||'').toLowerCase();
        return ${JSON.stringify(keywords)}.some(k => t === k || a === k) && e.getBoundingClientRect().width > 0;
      });
      if (found) {
        const r = found.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });
  if (!result.result?.value) throw new Error('Elemento no encontrado con palabras clave: ' + keywords.join(', '));
  return JSON.parse(result.result.value);
}

main().catch(e => { console.error('❌ Error en creación de álbum:', e.message); process.exit(1); });
