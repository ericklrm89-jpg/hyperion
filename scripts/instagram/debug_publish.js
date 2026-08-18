const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

// Usamos el video pre-formateado físicamente a 4:5 vertical (1080x1350)
const VIDEO_PATH = 'C:\\hyperion\\media\\fairdraw_v2_promo_4_5.mp4';
const CAPTION = 'Animate your giveaway fairly! With FairDraw, every winner is chosen automatically and AI-verified. Visit fairdrawapp.com now to run your first 100% transparent sweepstakes! 🎁🍀 #FairDraw #Giveaway #AI #Sweepstakes #Trust';

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

async function clickXY(ws, x, y) {
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function takeSnap(ws, filename) {
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\' + filename, Buffer.from(ss.data, 'base64'));
  console.log(`📸 Captura guardada: ${filename}`);
}

async function main() {
  console.log('🔍 Iniciando subida en Instagram del video pre-formateado a 4:5...');
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)));
    }).on('error', rej);
  });
  
  const tab = tabs.find(t => t.type === 'page' && t.url.includes('instagram.com'));
  if (!tab) throw new Error('No se encontró tab de Instagram');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');
  await wait(1000);

  // Recargar la página primero para limpiar estados anteriores de modales
  console.log('🧭 Recargando Instagram...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: 'window.location.href = "https://www.instagram.com/fairdrawapp/"' });
  await wait(6000);
  await takeSnap(ws, 'ig_step1_initial.png');

  // Buscar el botón Crear en la barra lateral (x < 100px)
  console.log('🖱️ Buscando y haciendo clic en "Crear" de la barra lateral (x < 100px)...');
  const createCoords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const els = Array.from(document.querySelectorAll('a, button, div[role="button"], span, svg'));
      const sidebarCreate = els.find(e => {
        const aria = (e.getAttribute('aria-label')||'').toLowerCase();
        const txt = (e.textContent||'').toLowerCase().trim();
        const r = e.getBoundingClientRect();
        const isSidebar = r.left < 100 && r.width > 0;
        return isSidebar && (aria.includes('crear') || aria.includes('create') || aria.includes('post') || txt.includes('crear') || txt.includes('create') || e.querySelector('svg[aria-label="Nuevo post"]') || e.querySelector('svg[aria-label="New post"]'));
      });

      if (sidebarCreate) {
        sidebarCreate.scrollIntoView({ block: 'center' });
        const r = sidebarCreate.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });

  if (!createCoords.result?.value) {
    throw new Error('No se encontró el botón Crear en la barra lateral compacta.');
  }

  const cc = JSON.parse(createCoords.result.value);
  console.log(`🎯 Coordenadas de "Crear" lateral: x=${cc.x}, y=${cc.y}. Clickeando...`);
  await clickXY(ws, cc.x, cc.y);
  await wait(3000);
  await takeSnap(ws, 'ig_step2_after_create_click.png');

  // Marcar el input file correcto de la modal con data-hu
  console.log('🏷️ Marcando el input file del modal...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(function(){
      var inputs = document.querySelectorAll('input[type=file]');
      var target = null;
      for (var i = 0; i < inputs.length; i++) {
        var p = inputs[i].parentElement;
        while (p && p !== document.body) {
          if (p.getAttribute && p.getAttribute('role') === 'dialog') {
            target = inputs[i];
            break;
          }
          p = p.parentElement;
        }
        if (target) break;
      }
      if (!target && inputs.length > 0) target = inputs[0];
      if (target) target.setAttribute('data-hu', '1');
    })()`
  });
  await wait(500);

  // Buscar el input file con querySelector usando data-hu
  await cdpCall(ws, 'DOM.enable');
  const doc = await cdpCall(ws, 'DOM.getDocument');
  const inp = await cdpCall(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[data-hu]' });

  if (inp && inp.nodeId) {
    console.log(`📤 Input con data-hu encontrado! Inyectando video: ${VIDEO_PATH}`);
    const ni = await cdpCall(ws, 'DOM.describeNode', { nodeId: inp.nodeId });
    await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: ni.node.backendNodeId, files: [VIDEO_PATH] });
    
    // Limpiar atributo data-hu
    await cdpCall(ws, 'Runtime.evaluate', { expression: "document.querySelectorAll('[data-hu]').forEach(function(e){e.removeAttribute('data-hu')})" });
    
    console.log('   ⏳ Esperando 12 segundos para procesamiento y carga de video...');
    await wait(12000);
    await takeSnap(ws, 'ig_step4_after_video_inject.png');

    // Clic en "Siguiente" (header, y < 200)
    console.log('🖱️ Clic en Siguiente 1...');
    for (let t = 0; t < 5; t++) {
      const sig = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(function(){
          var dialog = document.querySelector('[role="dialog"]');
          if (!dialog) return '{}';
          var all = dialog.querySelectorAll('*');
          var found = null;
          for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
            var r = el.getBoundingClientRect();
            if (r.width < 10 || r.height < 10) continue;
            if (r.top < 50 || r.top > 200) continue;
            var text = (el.textContent || '').trim().toLowerCase();
            if (text.includes('siguiente') || text.includes('next')) {
              var x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
              if (!found || x > found.x) found = { x: x, y: y };
            }
          }
          return found ? JSON.stringify(found) : '{}';
        })()`,
        returnByValue: true
      });
      
      const pos = JSON.parse(sig.result.value);
      if (pos.x) {
        console.log(`🎯 Clic Siguiente @ (${pos.x}, ${pos.y})`);
        await clickXY(ws, pos.x, pos.y);
        break;
      }
      console.log('Waiting Siguiente 1... ' + (t + 1));
      await wait(1500);
    }
    await wait(3000);
    await takeSnap(ws, 'ig_step5_next1.png');

    // Clic en "Siguiente" 2 o "Compartir"
    console.log('🖱️ Buscando botón "Siguiente" o "Compartir" de cabecera...');
    for (let t = 0; t < 5; t++) {
      const btn = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(function(){
          var dialog = document.querySelector('[role="dialog"]');
          if (!dialog) return '{}';
          var all = dialog.querySelectorAll('*');
          var found = null;
          for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
            var r = el.getBoundingClientRect();
            if (r.width < 10 || r.height < 10) continue;
            if (r.top < 50 || r.top > 200) continue;
            var text = (el.textContent || '').trim().toLowerCase();
            if (text.includes('siguiente') || text.includes('next') || text.includes('compartir') || text.includes('share')) {
              var x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
              if (!found || x > found.x) found = { x: x, y: y };
            }
          }
          return found ? JSON.stringify(found) : '{}';
        })()`,
        returnByValue: true
      });

      const pos = JSON.parse(btn.result.value);
      if (pos.x) {
        console.log(`🎯 Clic en botón @ (${pos.x}, ${pos.y})`);
        await clickXY(ws, pos.x, pos.y);
        break;
      }
      console.log('Waiting next/share button... ' + (t + 1));
      await wait(1500);
    }
    await wait(3000);
    await takeSnap(ws, 'ig_step6_next2.png');

    // Escribir Caption buscando tanto textarea como divs editables
    console.log('✍️ Escribiendo caption en el cuadro de texto...');
    await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const ta = document.querySelector('textarea, div[contenteditable="true"], div[role="textbox"]');
        if (ta) {
          ta.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, ${JSON.stringify(CAPTION)});
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      })()`,
      returnByValue: true
    });
    await wait(1500);
    await takeSnap(ws, 'ig_step7_caption.png');

    // Clic final en Compartir
    console.log('🚀 Clic final en Compartir...');
    await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button, span, div[role="button"]'));
        const share = buttons.find(b => {
          const t = (b.textContent||'').trim().toLowerCase();
          return t === 'compartir' || t === 'share';
        });
        if (share) {
          share.click();
          return true;
        }
        return false;
      })()`
    });
    await wait(9000);
    await takeSnap(ws, 'ig_step8_final.png');

  } else {
    console.log('❌ No se encontró el input con data-hu en el DOM.');
  }

  ws.close();
}

main().catch(console.error);
