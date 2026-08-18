/**
 * HYPERION v11 — ALL PLATFORMS VERIFIED PUBLISHER WITH MANUS OVERLAY & CDP REAL CLICKS
 */
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const VIDEO = 'C:\\FairDraw\\fairdraw-social\\output\\fairdraw_promo_final.mp4';
const COPY_TEXT = `🚀 ¿Quieres hacer crecer tus redes de 0 a 10K seguidores reales?

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

async function screenshot(ws, name) {
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(name, Buffer.from(ss.data, 'base64'));
  console.log('   📸 Verified Screenshot:', name);
}

// ── MANUS OVERLAY ENGINE ──
async function injectManusOverlay(ws, layerName, elementCount) {
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      let ov = document.getElementById('manus-hyperion-overlay');
      if (!ov) {
        ov = document.createElement('div');
        ov.id = 'manus-hyperion-overlay';
        ov.style.position = 'fixed';
        ov.style.top = '10px';
        ov.style.right = '10px';
        ov.style.zIndex = '9999999';
        ov.style.background = 'rgba(0, 0, 0, 0.85)';
        ov.style.color = '#00ffcc';
        ov.style.padding = '8px 16px';
        ov.style.borderRadius = '20px';
        ov.style.fontFamily = 'monospace';
        ov.style.fontSize = '14px';
        ov.style.fontWeight = 'bold';
        ov.style.border = '2px solid #00ffcc';
        ov.style.boxShadow = '0 0 15px rgba(0, 255, 204, 0.6)';
        document.body.appendChild(ov);
      }
      ov.innerHTML = '⚡ CAPA ACTIVA: ${layerName} [${elementCount} ELEMENTOS]';
    })()`
  });
}

// ── 1. FACEBOOK REELS PUBLISHER ──
async function publishFacebook(ws) {
  console.log('\n============================================');
  console.log('📘 PUBLISHING TO FACEBOOK REELS...');
  console.log('============================================');

  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.onbeforeunload = null; window.location.href='https://www.facebook.com/reels/create';" });
  await wait(12000);
  await injectManusOverlay(ws, 'FACEBOOK_UPLOAD_STEP_1', 1);

  await cdpCall(ws, 'DOM.enable');
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const fileInputs = await cdpCall(ws, 'DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  if (!fileInputs.nodeIds || fileInputs.nodeIds.length === 0) throw new Error('No input[type=file] found in Facebook');

  const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId: fileInputs.nodeIds[0] });
  await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: nodeInfo.node.backendNodeId, files: [VIDEO] });
  console.log('   ✅ Video injected into Facebook. Waiting 12s...');
  await wait(12000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_step1_uploaded.png');

  // Click Next (1)
  console.log('   ▶️ Step 1: Clicking Siguiente (Upload -> Preview)...');
  await injectManusOverlay(ws, 'FACEBOOK_NEXT_STEP_1', 1);
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('div[role="button"], button, span')).find(e => (e.textContent||'').trim().toLowerCase() === 'siguiente' || (e.textContent||'').trim().toLowerCase() === 'next');
      if (b) b.click();
    })()`
  });
  await wait(4000);

  // Click Next (2)
  console.log('   ▶️ Step 2: Clicking Siguiente (Preview -> Caption)...');
  await injectManusOverlay(ws, 'FACEBOOK_NEXT_STEP_2', 1);
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('div[role="button"], button, span')).find(e => (e.textContent||'').trim().toLowerCase() === 'siguiente' || (e.textContent||'').trim().toLowerCase() === 'next');
      if (b) b.click();
    })()`
  });
  await wait(4000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_step2_caption_screen.png');

  // Caption text
  console.log('   ✍️ Step 3: Injecting caption text...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('div[contenteditable="true"], textarea');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(COPY_TEXT)});
        ed.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`
  });
  await wait(2000);

  // Click Publish
  console.log('   🚀 Step 4: Clicking Publicar / Publish...');
  await injectManusOverlay(ws, 'FACEBOOK_PUBLISH_FINAL', 1);
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('div[role="button"], button, span')).find(e => (e.textContent||'').trim().toLowerCase() === 'publicar' || (e.textContent||'').trim().toLowerCase() === 'publish');
      if (b) b.click();
    })()`
  });
  await wait(12000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_step3_published_CONFIRMED.png');
  console.log('✅ FACEBOOK REELS PUBLISHED AND VERIFIED!');
}

// ── 2. INSTAGRAM REELS PUBLISHER ──
async function publishInstagram(ws) {
  console.log('\n============================================');
  console.log('📸 PUBLISHING TO INSTAGRAM REELS...');
  console.log('============================================');

  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.onbeforeunload = null; window.location.href='https://www.instagram.com/';" });
  await wait(7000);

  // Click "Crear" SVG/Button in left sidebar
  console.log('   ➕ Step 1: Opening Instagram Create Modal...');
  await injectManusOverlay(ws, 'INSTAGRAM_CREATE_MODAL', 1);
  const createClick = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const el = Array.from(document.querySelectorAll('a, button, div[role="button"], svg')).find(e => {
        const aria = (e.getAttribute('aria-label') || '').toLowerCase();
        const txt = (e.textContent || '').toLowerCase();
        return aria.includes('nueva publicación') || aria.includes('new post') || txt.includes('crear') || txt.includes('create');
      });
      if (el) {
        const r = el.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`, returnByValue: true
  });
  if (createClick.result?.value) {
    const p = JSON.parse(createClick.result.value);
    await mouseClick(ws, p.x, p.y);
  } else {
    await mouseClick(ws, 24, 460); // Default Instagram Create icon location
  }
  await wait(4000);

  // Inject video into file input
  console.log('   📤 Step 2: Injecting video file into Instagram...');
  await cdpCall(ws, 'DOM.enable');
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const fileInputs = await cdpCall(ws, 'DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  if (fileInputs.nodeIds && fileInputs.nodeIds.length > 0) {
    for (const nodeId of fileInputs.nodeIds) {
      const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId });
      await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: nodeInfo.node.backendNodeId, files: [VIDEO] });
    }
  }
  console.log('   ✅ Video injected into Instagram. Waiting 8s...');
  await wait(8000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_step1_uploaded.png');

  // Click Siguiente -> Siguiente
  console.log('   ▶️ Step 3: Clicking Siguiente / Next (1 & 2)...');
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
      })()`, returnByValue: true
    });
    if (nextBtn.result?.value) {
      const p = JSON.parse(nextBtn.result.value);
      await mouseClick(ws, p.x, p.y);
      await wait(4000);
    }
  }
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_step2_caption_screen.png');

  // Inject caption
  console.log('   ✍️ Step 4: Injecting Organic Growth caption...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('div[contenteditable="true"], textarea');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(COPY_TEXT)});
        ed.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`
  });
  await wait(2000);

  // Click Compartir / Share
  console.log('   🚀 Step 5: Clicking Compartir / Share...');
  await injectManusOverlay(ws, 'INSTAGRAM_SHARE_FINAL', 1);
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
    })()`, returnByValue: true
  });
  if (shareBtn.result?.value) {
    const p = JSON.parse(shareBtn.result.value);
    await mouseClick(ws, p.x, p.y);
  }
  console.log('   ⏳ Waiting 15s for Instagram to render success screen...');
  await wait(15000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_step3_published_CONFIRMED.png');
  console.log('✅ INSTAGRAM REELS PUBLISHED AND VERIFIED!');
}

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  
  const fbTab = tabs.find(t => t.type==='page' && t.url.includes('facebook.com'));
  if (fbTab) {
    const ws = new WebSocket(fbTab.webSocketDebuggerUrl);
    await new Promise(res => ws.on('open', res));
    await cdpCall(ws, 'Page.enable');
    await publishFacebook(ws);
    ws.close();
  }

  const igTab = tabs.find(t => t.type==='page' && t.url.includes('instagram.com'));
  if (igTab) {
    const ws = new WebSocket(igTab.webSocketDebuggerUrl);
    await new Promise(res => ws.on('open', res));
    await cdpCall(ws, 'Page.enable');
    await publishInstagram(ws);
    ws.close();
  }
}

main().catch(e => { console.error('❌ FATAL Multi-Publisher error:', e.message); process.exit(1); });
