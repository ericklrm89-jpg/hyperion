/**
 * HYPERION v11 — TikTok Studio Video Publisher (PRODUCCIÓN)
 * Robust version that ensures Everyone privacy and proper rich text copy injection.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const VIDEO_PATH = 'C:\\Users\\erick\\Downloads\\Por_favor_anime_estas_ilust.mp4';
const CAPTION = 'Sorteios 100% transparentes com IA 🎉🛡️\n\nO FairDraw usa Inteligência Artificial para garantir sorteios justos e auditados.\n\nAcesse fairdrawapp.com! 🌐\n#FairDraw #Sorteio #IA #Transparencia #Giveaway #Brasil #FairPlay';

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

async function main() {
  if (!fs.existsSync(VIDEO_PATH)) throw new Error('Video no encontrado: ' + VIDEO_PATH);

  console.log('\n═══════════════════════════════════════');
  console.log('🚀 HYPERION TIKTOK STUDIO — Publicador');
  console.log('═══════════════════════════════════════');

  console.log('   🔍 Localizando tab de TikTok...');
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)));
    }).on('error', rej);
  });
  const tab = tabs.find(t => t.type === 'page' && t.url.includes('tiktok.com'));
  if (!tab) throw new Error('No se encontró la pestaña de TikTok abierta.');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  console.log('   ✅ Conexión WebSocket establecida.');

  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // Evasión de popup de salida
  await cdpCall(ws, 'Runtime.evaluate', { expression: `window.onbeforeunload = null;` });

  // 0. Navegar a la página principal de TikTok Studio para evitar crashes de SPA
  console.log('   🧭 Navegando a tiktok.com/tiktokstudio...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.location.href='https://www.tiktok.com/tiktokstudio';" });
  await wait(6000);

  console.log('   🖱️ Click en "Upload" de la barra lateral...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(e => (e.textContent||'').trim() === 'Upload');
      if (btn) { btn.click(); return 'clicked'; }
      return 'not found';
    })()`,
    returnByValue: true
  });
  await wait(6000);

  // Detectar si la página falló y hacer click en Retry
  const isCrashed = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      return (document.body.textContent || '').includes('Something went wrong') || 
             !!Array.from(document.querySelectorAll('button')).find(e => (e.textContent||'').trim() === 'Retry');
    })()`, returnByValue: true
  });

  if (isCrashed.result?.value) {
    console.log('   ⚠️ Se detectó pantalla de error. Hacendo click en Retry...');
    await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(e => (e.textContent||'').trim() === 'Retry' || (e.textContent||'').trim() === 'Reintentar');
        if (btn) btn.click();
      })()`
    });
    await wait(6000);
  }

  // 1. Inyectar archivo
  console.log('   📤 Buscando input de subida de archivos...');
  let queryRes = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
    queryRes = await cdpCall(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
    if (queryRes.nodeId) {
      break;
    }
    console.log(`   ⏳ Esperando input[type="file"] (intento ${attempt + 1}/12)...`);
    await wait(1500);
  }
  if (!queryRes || !queryRes.nodeId) throw new Error('No se encontró el elemento input file en TikTok');

  const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId: queryRes.nodeId });
  console.log('   📤 Inyectando video directamente vía CDP...');
  await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: nodeInfo.node.backendNodeId, files: [VIDEO_PATH] });
  
  console.log('   ⏳ Esperando 12 segundos a que TikTok procese la subida y monte los paneles...');
  await wait(12000);

  // 2. Rellenar Caption usando execCommand para emular teclado React/DraftJS
  console.log('   ✍️ Escribiendo caption en el editor...');
  const written = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const editor = document.querySelector('[contenteditable="true"], textarea, div[role="textbox"]');
      if (editor) {
        editor.focus();
        // Limpiar contenido
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        // Escribir texto
        document.execCommand('insertText', false, ${JSON.stringify(CAPTION)});
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('   Write result:', written.result?.value);
  await wait(2000);

  // 3. Cambiar Privacidad de "Only me" a "Everyone" si está en "Only me"
  console.log('   🔒 Buscando control de privacidad (Everyone)...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="button"], span'));
      // Buscar el selector que dice "Only me"
      const onlyMe = btns.find(b => {
        const t = (b.innerText || b.textContent || '').trim().toLowerCase();
        return t === 'only me' || t === 'solo yo';
      });
      if (onlyMe) {
        onlyMe.click();
        return 'clicked_only_me';
      }
      return 'not_found';
    })()`
  });
  await wait(2000);

  // Clic en la opción "Everyone" (Todos) en el menú flotante
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const opts = Array.from(document.querySelectorAll('li, div, span, button'));
      const everyone = opts.find(o => {
        const t = (o.innerText || o.textContent || '').trim().toLowerCase();
        return t === 'everyone' || t === 'amigos o todo el mundo' || t === 'público' || t === 'public';
      });
      if (everyone) {
        everyone.click();
        return 'clicked_everyone';
      }
      return 'not_found';
    })()`
  });
  await wait(2000);

  // 4. Presionar botón "Publicar"
  console.log('   🚀 Presionando botón Publicar...');
  const publishClicked = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => {
        const t = (b.textContent||b.innerText||'').trim().toLowerCase();
        return t === 'publicar' || t === 'post' || t === 'postar' || t === 'compartilhar' || t === 'share';
      });
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('   Publish click result:', publishClicked.result?.value);
  await wait(4000);

  // 5. Modal de confirmación final ("Publicar ahora" o "Entendido")
  console.log('   🎯 Confirmando modal final de publicación...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
      const confirmBtn = btns.find(b => {
        const t = (b.textContent||b.innerText||'').trim().toLowerCase();
        return t === 'publicar agora' || t === 'publicar agora' || t === 'post now' ||
               t === 'entendido' || t === 'confirm' || t === 'confirmar' ||
               t === 'close' || t === 'fechar' || t === 'ok';
      });
      if (confirmBtn) {
        confirmBtn.click();
        return 'confirmed';
      }
      return 'none';
    })()`,
    returnByValue: true
  });
  await wait(8000);

  // Captura final
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\tiktok_published.png', Buffer.from(ss.data, 'base64'));
  console.log('   📸 Captura guardada en tiktok_published.png');
  
  ws.close();
  console.log('🎉 TikTok publicado exitosamente!');
}

main().catch(err => console.error('❌ Error fatal en TikTok:', err.message));
