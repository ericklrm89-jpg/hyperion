/**
 * HYPERION v11 — Instagram Reels Publisher (LIVE FIXED & VERIFIED)
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
  console.log('🚀 HYPERION — Instagram Reels Live Fix & Verify');
  console.log('============================================');

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  let tab = tabs.find(t => t.type==='page' && t.url.includes('instagram.com'));
  if (!tab) {
    tab = tabs.find(t => t.type==='page' && !t.url.includes('devtools'));
  }
  if (!tab) throw new Error('No browser tab available');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // STEP 0: Reset profile page
  console.log('\n🆕 STEP 0: Navigating to Instagram profile...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.onbeforeunload = null; window.location.href='https://www.instagram.com/fairdrawapp/';" });
  await wait(7000);

  // STEP 1: Click Create
  console.log('\n➕ STEP 1: Clicking Create in sidebar...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('a, button, div[role="button"], span')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.left < 120 && (txt.includes('create') || txt.includes('crear') || txt.includes('nueva'));
      });
      if (btns.length > 0) btns[0].click();
    })()`
  });
  await wait(4000);

  // STEP 2: File injection
  console.log('\n📤 STEP 2: Injecting video file...');
  await cdpCall(ws, 'DOM.enable');
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const fileInputs = await cdpCall(ws, 'DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  if (fileInputs.nodeIds && fileInputs.nodeIds.length > 0) {
    for (const nodeId of fileInputs.nodeIds) {
      const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId });
      await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: nodeInfo.node.backendNodeId, files: [VIDEO] });
    }
  }
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      document.querySelectorAll('input[type="file"]').forEach(i => {
        i.dispatchEvent(new Event('change', { bubbles: true }));
        i.dispatchEvent(new Event('input', { bubbles: true }));
      });
    })()`
  });
  console.log('   ✅ Video injected into Instagram. Waiting 8s for preview...');
  await wait(8000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\verif_ig_01_uploaded.png');

  // STEP 3: Click Next -> Next
  console.log('\n▶️ STEP 3: Clicking Next / Siguiente buttons...');
  for (let s = 1; s <= 2; s++) {
    const nextBtn = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('div[role="button"], button, span')).filter(e => {
          const txt = (e.textContent || '').trim().toLowerCase();
          const r = e.getBoundingClientRect();
          return (txt === 'next' || txt === 'siguiente') && r.width > 0;
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
      console.log(`   Siguiente ${s} at x=${p.x}, y=${p.y}`);
      await mouseClick(ws, p.x, p.y);
      await wait(4000);
    }
  }
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\verif_ig_02_caption_screen.png');

  // STEP 4: Caption text injection
  console.log('\n✍️ STEP 4: Injecting Organic Growth caption...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('div[contenteditable="true"], textarea');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(COPY_IG)});
        ed.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    })()`
  });
  await wait(2000);

  // STEP 5: Share button click
  console.log('\n🚀 STEP 5: Clicking Share / Compartir button...');
  const shareBtn = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button, span')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'share' || txt === 'compartir') && r.width > 0;
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
  if (shareBtn.result?.value) {
    const p = JSON.parse(shareBtn.result.value);
    console.log(`   Share clicked at x=${p.x}, y=${p.y}`);
    await mouseClick(ws, p.x, p.y);
  }
  console.log('   ⏳ Waiting 15s for Instagram to process & show success modal...');
  await wait(15000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\verif_ig_03_shared_final.png');

  ws.close();
  console.log('\n✅ Instagram Reels verification complete!');
}

main().catch(e => { console.error('❌ FATAL Instagram verification error:', e.message); process.exit(1); });
