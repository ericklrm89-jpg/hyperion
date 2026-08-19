/**
 * HYPERION v11 — Facebook Page Feed Photo Publisher (PRODUCCIÓN)
 * 
 * Publica una foto en el feed de la página de perfil de forma robusta:
 * 1. Cierra diálogos previos.
 * 2. Clickea en el botón rápido "Photo/video" del compositor de la biografía.
 * 3. Inyectar archivo vía CDP directamente.
 * 4. Escribir descripción.
 * 5. Secuencia de publicación modal: Next -> Post.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const IMAGE_PATH = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\story_test_1_cropped.jpg';
const CAPTION = 'New FairDraw 3D Official Design Concept! 🍀 Transparencia total y emoción garantizada en cada sorteo. Descubre una nueva era de giveaway certificada con IA y blockchain. 🚀🎁 #FairDraw #CGI #Giveaway #Art';

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
  function render(){try{document.querySelectorAll('.HYL').forEach(e=>e.remove());var els=vis();var info=document.createElement('div');info.className='HYL';info.style.cssText='top:3px;left:50%;transform:translateX(-50%);padding:3px 10px;background:rgba(0,0,0,.85);border-radius:4px;font:bold 12px monospace;color:#0f0;border:1px solid #0f0;white-space:nowrap;';info.textContent='HYPERION FEED ['+els.length+' | DINÁMICO 250ms]';document.body.appendChild(info);for(var i=0;i<els.length;i++){var e=els[i],c=C[i%C.length],d=document.createElement('div');d.className='HYL';d.style.cssText='left:'+e.rc.left+'px;top:'+e.rc.top+'px;width:'+e.rc.width+'px;height:'+e.rc.height+'px;background:'+c.f+';border:2px solid '+c.b+';';d.textContent='['+(i+1)+'] '+e.txt.slice(0,14);document.body.appendChild(d);}}catch(e){}}
  render(); window.__HYT=setInterval(render,250);
})();`;

async function main() {
  if (!fs.existsSync(IMAGE_PATH)) throw new Error('Imagen no encontrada: ' + IMAGE_PATH);

  console.log('\n═══════════════════════════════════════');
  console.log('🚀 HYPERION FACEBOOK FEED — Creador de Post');
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

  // Comprobar si ya estamos en el perfil
  const onProfile = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      return window.location.href.includes('profile.php?id=61590067290511') && document.body.textContent.includes('FairDraw App');
    })()`,
    returnByValue: true
  });

  if (onProfile.result?.value) {
    console.log('   📍 Ya estamos en la página de perfil. Omitiendo navegación.');
  } else {
    console.log('   🧭 Navegando a la página de perfil...');
    await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href='https://www.facebook.com/profile.php?id=61590067290511'` });
    await wait(6000);
  }

  // Inyectar Manus
  await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS });

  // Cerrar cualquier modal bloqueante anterior (Reviews, etc.)
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = Array.from(document.querySelectorAll('div[aria-label="Close"], button[aria-label="Close"], div')).find(e => {
        const a = e.getAttribute('aria-label');
        const t = (e.textContent||'').trim().toLowerCase();
        return (a === 'Close' || t === 'close' || a === 'Cerrar' || t === 'cerrar') && e.getBoundingClientRect().width > 0;
      });
      if (closeBtn) closeBtn.click();
    })()`
  });
  await wait(1500);

  // 1. Hacer clic en el botón rápido "Photo/video" (Foto/video) de la biografía
  console.log('   🖱️  Abriendo el compositor mediante botón de Foto/video...');
  const mediaBtnCoords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const els = Array.from(document.querySelectorAll('div[role="button"], span, div'));
      const icon = els.find(el => {
        const t = (el.textContent || '').trim().toLowerCase();
        const r = el.getBoundingClientRect();
        const isPhotoVideo = t === 'photo/video' || t === 'foto/video';
        // Buscamos el botón interactivo que está debajo de "¿Qué estás pensando?"
        return isPhotoVideo && r.width > 50 && r.height > 15;
      });
      if (icon) {
        const r = icon.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });

  if (!mediaBtnCoords.result?.value) throw new Error('No se encontró el botón rápido "Photo/video" en el perfil.');
  const mc = JSON.parse(mediaBtnCoords.result.value);
  console.log(`   Clic en Foto/video en coords: (${mc.x}, ${mc.y})`);
  await mouseClick(ws, mc.x, mc.y);
  await wait(5000);

  // Captura compositor modal
  const ss1 = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('fb_feed_composer_empty.png', Buffer.from(ss1.data, 'base64'));
  console.log('   📸 fb_feed_composer_empty.png');

  // 2. Localizar input[type="file"] en la modal activa
  console.log('   Buscando input de subida de archivos...');
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const queryRes = await cdpCall(ws, 'DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });

  if (!queryRes.nodeId) throw new Error('No se encontró el elemento input[type="file"] en el compositor');

  const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId: queryRes.nodeId });
  const backendNodeId = nodeInfo.node.backendNodeId;

  // 3. Inyectar la imagen
  console.log('   📤 Inyectando foto en el compositor...');
  await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId, files: [IMAGE_PATH] });
  console.log('   ✅ Foto inyectada.');
  await wait(5000);

  // 4. Escribir descripción/caption
  console.log('   ✍️  Escribiendo descripción en el post...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector('div[contenteditable="true"]') || document.querySelector('div[role="textbox"]');
      if (el) {
        el.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(CAPTION)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return 'written';
      }
      return 'not found';
    })()`
  });
  await wait(1500);

  // Tomar captura del post listo
  const ss2 = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('fb_feed_post_ready.png', Buffer.from(ss2.data, 'base64'));
  console.log('   📸 fb_feed_post_ready.png');

  // 5. Secuencia de publicación: Next -> Post (dentro de la modal)
  console.log('   🚀 Iniciando secuencia de publicación...');
  const nextCoords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const root = dialog || document;
      const els = Array.from(root.querySelectorAll('div[role="button"], button, div'));
      const btn = els.find(el => {
        const t = (el.textContent || '').trim().toLowerCase();
        const r = el.getBoundingClientRect();
        return (t === 'next' || t === 'siguiente') && r.width > 50 && r.height > 15;
      });
      if (btn) {
        const r = btn.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });

  if (nextCoords.result?.value) {
    const nc = JSON.parse(nextCoords.result.value);
    console.log(`   Clic en "Next" / "Siguiente" en coords: (${nc.x}, ${nc.y})`);
    await mouseClick(ws, nc.x, nc.y);
    await wait(4000);

    const ssNext = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('fb_feed_post_after_next.png', Buffer.from(ssNext.data, 'base64'));
    console.log('   📸 fb_feed_post_after_next.png');
  } else {
    console.log('   (Botón Next no requerido, intentando publicar directamente)');
  }

  console.log('   Encontrando botón de confirmación final ("Post", "Share", "Publicar")...');
  const postCoords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const root = dialog || document;
      const els = Array.from(root.querySelectorAll('div[role="button"], button, div'));
      const btn = els.find(el => {
        const t = (el.textContent || '').trim().toLowerCase();
        const r = el.getBoundingClientRect();
        return (t === 'publicar' || t === 'post' || t === 'share' || t === 'compartir') && r.width > 50 && r.height > 15;
      });
      if (btn) {
        const r = btn.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });

  if (!postCoords.result?.value) throw new Error('No se encontró el botón final de publicar (Post/Share)');
  const pc = JSON.parse(postCoords.result.value);
  console.log(`   Clic en botón final de publicación en coords: (${pc.x}, ${pc.y})`);
  await mouseClick(ws, pc.x, pc.y);

  console.log('   ⏳ Esperando confirmación de publicación (8s)...');
  await wait(8000);

  // Tomar captura final
  const ss3 = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('fb_feed_post_published.png', Buffer.from(ss3.data, 'base64'));
  console.log('   📸 fb_feed_post_published.png');

  console.log('\n═══════════════════════════════════════');
  console.log('🎉 POST DE FOTO PUBLICADO CON ÉXITO EN EL FEED');
  console.log('═══════════════════════════════════════');
  ws.close();
}

main().catch(e => { console.error('❌ Error en publicación de feed post:', e.message); process.exit(1); });
