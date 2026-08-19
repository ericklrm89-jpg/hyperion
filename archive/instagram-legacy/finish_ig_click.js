/**
 * HYPERION — Complete Instagram Reels Upload Live
 */
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const VIDEO = 'C:\\FairDraw\\fairdraw-social\\output\\fairdraw_promo_final.mp4';
const COPY_IG = `🚀 ¿Quieres hacer crecer tus redes de 0 a 10K seguidores reales?

El secreto de los creadores que más crecen no es publicar 5 veces al día, es usar dinámicas virales de alta retención. Con FairDraw atraes público calificado de tu nicho, multiplicas la interacción de tu perfil y conviertes espectadores en clientes fieles. 📈⚡

🌐 fairdrawapp.com

#CrecimientoOrganico #CrecerEnInstagram #CrecerEnTikTok #Emprendedores #MarketingDigital #EstrategiaDigital #CreadoresDeContenido #FairDraw #RedesSociales`;

let cdpId = 1;
function cdpCall(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = cdpId++;
    const h = (data) => {
      try {
        const r = JSON.parse(data);
        if (r.id === id) { ws.removeListener('message', h); r.error ? reject(new Error(JSON.stringify(r.error))) : resolve(r.result || {}); }
      } catch(e) {}
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  const igTab = tabs.find(t => t.type==='page' && t.url.includes('instagram.com'));
  if (!igTab) throw new Error('No IG tab');

  const ws = new WebSocket(igTab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  console.log('1. Pressing Escape key to close modal view...');
  await cdpCall(ws, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape' });
  await cdpCall(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape' });
  await wait(2000);

  console.log('2. Clicking Create (+) in Instagram sidebar...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const svgs = Array.from(document.querySelectorAll('svg')).filter(s => {
        const aria = (s.getAttribute('aria-label') || '').toLowerCase();
        return aria.includes('nueva publicación') || aria.includes('new post');
      });
      if (svgs.length > 0) svgs[0].closest('a, button, div[role="button"]').click();
    })()`
  });
  await wait(3000);

  console.log('3. Injecting 22s video into input[type="file"]...');
  await cdpCall(ws, 'DOM.enable');
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const fileInputs = await cdpCall(ws, 'DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  if (fileInputs.nodeIds && fileInputs.nodeIds.length > 0) {
    const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId: fileInputs.nodeIds[0] });
    await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: nodeInfo.node.backendNodeId, files: [VIDEO] });
  }
  console.log('   Waiting 8s for preview render...');
  await wait(8000);

  console.log('4. Clicking Next (1)...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('div[role="button"], button, span')).find(e => (e.textContent||'').trim().toLowerCase() === 'siguiente' || (e.textContent||'').trim().toLowerCase() === 'next');
      if (b) b.click();
    })()`
  });
  await wait(4000);

  console.log('5. Clicking Next (2)...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('div[role="button"], button, span')).find(e => (e.textContent||'').trim().toLowerCase() === 'siguiente' || (e.textContent||'').trim().toLowerCase() === 'next');
      if (b) b.click();
    })()`
  });
  await wait(4000);

  console.log('6. Writing caption text...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('div[contenteditable="true"], textarea');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(COPY_IG)});
        ed.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`
  });
  await wait(2000);

  console.log('7. Clicking Compartir / Share...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('div[role="button"], button, span')).find(e => (e.textContent||'').trim().toLowerCase() === 'compartir' || (e.textContent||'').trim().toLowerCase() === 'share');
      if (b) b.click();
    })()`
  });
  console.log('   Waiting 15s for Instagram to render success screen...');
  await wait(15000);

  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_LIVE_SUCCESS_POSTED.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved ig_LIVE_SUCCESS_POSTED.png');
  ws.close();
}

main().catch(console.error);
