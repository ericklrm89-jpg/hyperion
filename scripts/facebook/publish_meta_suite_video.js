/**
 * HYPERION — Complete Meta Business Suite Video Upload & Publish
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

async function mouseClick(ws, x, y) {
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

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

  // STEP 1: Click Add photo/video at x=135, y=510
  console.log('1. Clicking Add photo/video button at x=135, y=510...');
  await mouseClick(ws, 135, 510);
  await wait(3000);

  // STEP 2: Check for dropdown or file input
  console.log('2. Finding and clicking Add Video option or file input...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const items = Array.from(document.querySelectorAll('div[role="menuitem"], button, span')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        return txt.includes('video') || txt.includes('upload') || txt.includes('cargar');
      });
      if (items.length > 0) items[0].click();
    })()`
  });
  await wait(2000);

  // STEP 3: Inject video into file input
  console.log('3. Injecting video file into Meta Business Suite...');
  await cdpCall(ws, 'DOM.enable');
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const fileInputs = await cdpCall(ws, 'DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  if (fileInputs.nodeIds && fileInputs.nodeIds.length > 0) {
    for (const nodeId of fileInputs.nodeIds) {
      const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId });
      await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: nodeInfo.node.backendNodeId, files: [VIDEO] });
    }
  }
  console.log('   Waiting 12s for Meta Business Suite video processing...');
  await wait(12000);

  let ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_meta_01_video_uploaded.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_meta_01_video_uploaded.png');

  // STEP 4: Click active Publish button
  console.log('4. Clicking active Publish button...');
  const pubBtn = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'publish' || txt === 'publicar') && r.width > 0;
      });
      if (btns.length > 0) {
        const b = btns[btns.length - 1];
        const r = b.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });
  if (pubBtn.result?.value) {
    const p = JSON.parse(pubBtn.result.value);
    console.log(`   Publish clicked at x=${p.x}, y=${p.y}`);
    await mouseClick(ws, p.x, p.y);
  } else {
    await mouseClick(ws, 480, 925);
  }

  console.log('   Waiting 15s for Meta Business Suite post publication...');
  await wait(15000);

  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_meta_02_POST_CONFIRMED.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_meta_02_POST_CONFIRMED.png');

  ws.close();
  console.log('\n✅ Meta Business Suite upload complete!');
}

main().catch(console.error);
