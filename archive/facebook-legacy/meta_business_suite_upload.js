/**
 * HYPERION — Meta Business Suite Creator Direct Upload
 */
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const VIDEO = 'C:\\FairDraw\\fairdraw-social\\output\\fairdraw_promo_final.mp4';
const COPY_FB = `🚀 ¿Quieres hacer crecer tus redes de 0 a 10K seguidores reales?

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
  const fbTab = tabs.find(t => t.type==='page' && t.url.includes('facebook.com'));
  if (!fbTab) throw new Error('No FB tab');

  const ws = new WebSocket(fbTab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // Navigate to Meta Business Suite Composer
  console.log('1. Navigating to Meta Business Suite Composer...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.location.href='https://business.facebook.com/latest/composer';" });
  await wait(10000);

  let ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_META_BUSINESS_COMPOSER.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_META_BUSINESS_COMPOSER.png');

  // Inject video file
  console.log('2. Injecting video into file input...');
  await cdpCall(ws, 'DOM.enable');
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const fileInputs = await cdpCall(ws, 'DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  if (fileInputs.nodeIds && fileInputs.nodeIds.length > 0) {
    const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId: fileInputs.nodeIds[0] });
    await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: nodeInfo.node.backendNodeId, files: [VIDEO] });
    console.log('   Video injected into Meta Business Suite!');
  }
  await wait(10000);

  // Write caption
  console.log('3. Injecting caption text...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('div[contenteditable="true"], textarea');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(COPY_FB)});
        ed.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`
  });
  await wait(2000);

  // Click Publish / Share
  console.log('4. Clicking Publish / Share...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button, span')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'publish' || txt === 'publicar' || txt === 'share' || txt === 'compartir') && r.width > 0;
      });
      if (btns.length > 0) {
        const b = btns[btns.length - 1];
        b.scrollIntoView({ block: 'center' });
        b.click();
      }
    })()`
  });
  await wait(15000);

  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_META_BUSINESS_POSTED.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_META_BUSINESS_POSTED.png');

  ws.close();
}

main().catch(console.error);
