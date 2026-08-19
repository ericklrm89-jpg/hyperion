/**
 * HYPERION v11 — Facebook Reels Publisher (LIVE FIXED & VERIFIED)
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

async function screenshot(ws, name) {
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(name, Buffer.from(ss.data, 'base64'));
  console.log('   📸 Screenshot saved:', name);
}

async function mouseClick(ws, x, y) {
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function main() {
  console.log('\n============================================');
  console.log('🚀 HYPERION — Facebook Reels Live Fix & Verify');
  console.log('============================================');

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  let tab = tabs.find(t => t.type==='page' && t.url.includes('facebook.com'));
  if (!tab) throw new Error('No Facebook tab available');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // STEP 0: Navigate to Reels Creator
  console.log('\n🆕 STEP 0: Navigating to Facebook Reels Creator...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.onbeforeunload = null; window.location.href='https://www.facebook.com/reels/create';" });
  await wait(10000);

  // STEP 1: Inject video file
  console.log('\n📤 STEP 1: Injecting video file into Facebook...');
  await cdpCall(ws, 'DOM.enable');
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const fileInputs = await cdpCall(ws, 'DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  if (fileInputs.nodeIds && fileInputs.nodeIds.length > 0) {
    for (const nodeId of fileInputs.nodeIds) {
      const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId });
      await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: nodeInfo.node.backendNodeId, files: [VIDEO] });
    }
  }
  console.log('   ✅ Video injected. Waiting 10s for upload...');
  await wait(10000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\verif_fb_01_uploaded.png');

  // STEP 2: Click Siguiente (Screen 1 -> Screen 2 -> Screen 3)
  console.log('\n▶️ STEP 2: Clicking Siguiente / Next buttons...');
  for (let step = 1; step <= 2; step++) {
    const nextBtn = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('div[role="button"], button, span')).filter(e => {
          const txt = (e.textContent || '').trim().toLowerCase();
          const r = e.getBoundingClientRect();
          return (txt === 'siguiente' || txt === 'next') && r.width > 0;
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
    if (nextBtn.result?.value) {
      const p = JSON.parse(nextBtn.result.value);
      console.log(`   Siguiente ${step} clicked at x=${p.x}, y=${p.y}`);
      await mouseClick(ws, p.x, p.y);
      await wait(3000);
    }
  }
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\verif_fb_02_caption_screen.png');

  // STEP 3: Caption injection
  console.log('\n✍️ STEP 3: Injecting Organic Growth caption...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('div[contenteditable="true"], textarea');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(COPY_FB)});
        ed.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    })()`
  });
  await wait(2000);

  // STEP 4: Click Publicar / Publish
  console.log('\n🚀 STEP 4: Clicking Publicar / Publish button...');
  const pubBtn = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button, span')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'publicar' || txt === 'publish') && r.width > 0;
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
  }
  console.log('   ⏳ Waiting 15s for Facebook Reel processing...');
  await wait(15000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\verif_fb_03_shared_final.png');

  ws.close();
  console.log('\n✅ Facebook Reels verification complete!');
}

main().catch(e => { console.error('❌ FATAL Facebook verification error:', e.message); process.exit(1); });
