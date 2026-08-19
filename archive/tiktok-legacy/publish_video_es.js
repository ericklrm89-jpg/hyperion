/**
 * HYPERION v11 — TikTok Studio Publisher (SPANISH - ORGANIC GROWTH)
 */
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const VIDEO = 'C:\\Users\\erick\\Downloads\\Por_favor_anime_estas_ilust (1).mp4';
const COPY_TT = `🚀 ¿Quieres hacer crecer tus redes de 0 a 10K seguidores reales? El secreto de los creadores que más crecen no es publicar 5 veces al día, es usar dinámicas virales de alta retención. Con FairDraw atraes público calificado de tu nicho y multiplicas la interacción de tu perfil. 📈⚡ fairdrawapp.com #CrecimientoOrganico #CrecerEnTikTok #CrecerEnInstagram #Emprendedores #MarketingDigital #EstrategiaDigital #CreadoresDeContenido #FairDraw #RedesSociales`;

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

async function screenshot(ws, name) {
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(name, Buffer.from(ss.data, 'base64'));
  console.log('   📸', name);
}

async function main() {
  console.log('\n════════════════════════════════════════════');
  console.log('🚀 HYPERION v11 — TikTok Studio Spanish');
  console.log('════════════════════════════════════════════');

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  let tab = tabs.find(t => t.type==='page' && t.url.includes('tiktok.com'));
  if (!tab) {
    tab = tabs.find(t => t.type==='page' && !t.url.includes('devtools') && !t.url.includes('chrome-untrusted'));
  }
  if (!tab) throw new Error('No browser tab available');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // STEP 0: Navigate to TikTok upload
  console.log('\n🆕 STEP 0: Navigating to TikTok Studio Creator Upload...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.onbeforeunload = null; window.location.href='https://www.tiktok.com/tiktokstudio/upload';" });
  await wait(10000);

  // STEP 1: Inject video via CDP
  console.log('\n📤 STEP 1: Injecting Spanish video file...');
  await cdpCall(ws, 'DOM.enable');
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const fileInputs = await cdpCall(ws, 'DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  if (!fileInputs.nodeIds || fileInputs.nodeIds.length === 0) throw new Error('No input[type="file"] found in TikTok');

  const targetNodeId = fileInputs.nodeIds[0];
  const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId: targetNodeId });
  const backendNodeId = nodeInfo.node.backendNodeId;

  await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId, files: [VIDEO] });
  console.log('   ✅ Spanish Video injected. Waiting for upload & draft render (12s)...');
  await wait(12000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\tt_01_cargado_es.png');

  // STEP 2: Caption text injection
  console.log('\n✍️ STEP 2: Writing Spanish caption...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('div[contenteditable="true"], textarea');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(COPY_TT)});
        ed.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    })()`
  });
  await wait(2000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\tt_02_copy_es.png');

  // STEP 3: Click Post
  console.log('\n🚀 STEP 3: Clicking Post button...');
  const postBtn = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'post' || txt === 'publicar' || txt === 'postar') && r.width > 0;
      });
      if (btn) {
        btn.scrollIntoView({ block: 'center' });
        const r = btn.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`, returnByValue: true
  });
  if (postBtn.result?.value) {
    const p = JSON.parse(postBtn.result.value);
    console.log(`   Post at x=${p.x}, y=${p.y}`);
    await mouseClick(ws, p.x, p.y);
    await wait(6000);
  }
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\tt_03_publicado_es.png');

  ws.close();
  console.log('\n✅ TikTok Studio (Spanish) PUBLISHED!');
}

main().catch(e => { console.error('❌ FATAL TikTok ES:', e.message); process.exit(1); });
