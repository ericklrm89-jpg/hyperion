/**
 * HYPERION — Unified Social Publisher
 * Uso: node publish_all.js [facebook|fb] [tiktok|tt] [instagram|ig]
 * Sin argumentos = publica en las 3 redes.
 */
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

const VIDEO_PATH = 'C:\\hyperion\\media\\fairdraw_v2_promo.mp4';
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

async function mouseClick(ws, x, y) {
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function getElementCoordsByText(ws, keywords) {
  const result = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const els = Array.from(document.querySelectorAll('button, [role="button"], div, a'));
      const found = els.find(e => {
        const t = (e.textContent||'').trim().toLowerCase();
        const a = (e.getAttribute('aria-label')||'').toLowerCase();
        return ${JSON.stringify(keywords)}.some(k => t === k || a === k) && e.getBoundingClientRect().width > 0;
      });
      if (found) {
        const r = found.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });
  if (!result.result?.value) return null;
  return JSON.parse(result.result.value);
}

async function getTabs() {
  return new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)));
    }).on('error', rej);
  });
}

// ============================================================================
// 1. FACEBOOK REELS
// ============================================================================
async function runFacebook(tabs) {
  console.log('\n--- PUBLICANDO EN FACEBOOK REELS ---');
  const tab = tabs.find(t => t.type === 'page' && t.url.includes('facebook.com'));
  if (!tab) { console.log('❌ Pestaña de Facebook no encontrada.'); return; }

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');
  await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href='https://www.facebook.com/reels/create'` });
  await wait(6000);

  let queryRes = null;
  for (let i = 0; i < 10; i++) {
    const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
    queryRes = await cdpCall(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
    if (queryRes.nodeId) break;
    console.log(`   ⏳ Esperando input (intento ${i+1}/10)...`);
    await wait(1000);
  }
  if (!queryRes?.nodeId) throw new Error('No se encontró input file en Facebook');

  const ni = await cdpCall(ws, 'DOM.describeNode', { nodeId: queryRes.nodeId });
  await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: ni.node.backendNodeId, files: [VIDEO_PATH] });
  console.log('   ✅ Video inyectado.');
  await wait(9000);

  const n1 = await getElementCoordsByText(ws, ['next', 'siguiente']);
  if (n1) await mouseClick(ws, n1.x, n1.y);
  await wait(3000);
  const n2 = await getElementCoordsByText(ws, ['next', 'siguiente']);
  if (n2) await mouseClick(ws, n2.x, n2.y);
  await wait(3000);

  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const t = document.querySelector('div[contenteditable="true"]');
      if (t) { t.focus(); document.execCommand('selectAll',false,null); document.execCommand('insertText',false,${JSON.stringify(CAPTION)}); }
    })()`
  });
  await wait(1500);

  const postPos = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('div,button')).find(d => {
        const t=(d.textContent||'').trim(); const r=d.getBoundingClientRect();
        return (t==='Post'||t==='Publicar') && r.width>100 && r.left>300;
      });
      if (btn) { const r=btn.getBoundingClientRect(); return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}); }
      return null;
    })()`, returnByValue: true
  });
  if (postPos.result?.value) {
    const p = JSON.parse(postPos.result.value);
    await mouseClick(ws, p.x, p.y);
    console.log('   ✅ Clic en Publicar.');
  }
  await wait(8000);

  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\facebook_published.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 facebook_published.png guardado.');
  ws.close();
}

// ============================================================================
// 2. TIKTOK STUDIO
// ============================================================================
async function runTikTok(tabs) {
  console.log('\n--- PUBLICANDO EN TIKTOK STUDIO ---');
  const tab = tabs.find(t => t.type === 'page' && t.url.includes('tiktok.com'));
  if (!tab) { console.log('❌ Pestaña de TikTok no encontrada.'); return; }

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');
  await cdpCall(ws, 'Runtime.evaluate', { expression: `window.onbeforeunload = null;` });
  await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href='https://www.tiktok.com/tiktokstudio/upload'` });
  await wait(6000);

  let queryRes = null;
  for (let i = 0; i < 10; i++) {
    const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
    queryRes = await cdpCall(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
    if (queryRes.nodeId) break;
    console.log(`   ⏳ Esperando input (intento ${i+1}/10)...`);
    await wait(1000);
  }
  if (!queryRes?.nodeId) throw new Error('No se encontró input file en TikTok');

  const ni = await cdpCall(ws, 'DOM.describeNode', { nodeId: queryRes.nodeId });
  await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: ni.node.backendNodeId, files: [VIDEO_PATH] });
  console.log('   ✅ Video inyectado.');
  await wait(12000);

  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('[contenteditable="true"],textarea,div[role="textbox"]');
      if (ed) { ed.focus(); document.execCommand('selectAll',false,null); document.execCommand('insertText',false,${JSON.stringify(CAPTION)}); ed.dispatchEvent(new Event('input',{bubbles:true})); }
    })()`
  });
  await wait(2000);

  // Cambiar privacidad a Everyone
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('button,div[role="button"],span')).find(b => {
        const t=(b.innerText||b.textContent||'').trim().toLowerCase();
        return t==='only me'||t==='solo yo';
      });
      if(b) b.click();
    })()`
  });
  await wait(2000);
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const o = Array.from(document.querySelectorAll('li,div,span,button')).find(o => {
        const t=(o.innerText||o.textContent||'').trim().toLowerCase();
        return t==='everyone'||t==='público'||t==='public';
      });
      if(o) o.click();
    })()`
  });
  await wait(2000);

  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('button')).find(b => {
        const t=b.textContent.trim().toLowerCase(); return t==='publicar'||t==='post';
      });
      if(b) b.click();
    })()`
  });
  await wait(4000);
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('button,[role="button"]')).find(b => {
        const t=b.textContent.trim().toLowerCase();
        return t==='publicar ahora'||t==='entendido'||t==='post now'||t==='confirm';
      });
      if(b) b.click();
    })()`
  });
  await wait(8000);

  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\tiktok_published.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 tiktok_published.png guardado.');
  ws.close();
}

// ============================================================================
// 3. INSTAGRAM REELS — con interceptor de file chooser
// ============================================================================
async function runInstagram(tabs) {
  console.log('\n--- PUBLICANDO EN INSTAGRAM ---');
  const tab = tabs.find(t => t.type === 'page' && t.url.includes('instagram.com'));
  if (!tab) { console.log('❌ Pestaña de Instagram no encontrada.'); return; }

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href='https://www.instagram.com/'` });
  await wait(5000);

  // Activar interceptor ANTES de hacer clic en Crear
  await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: true });
  const fileChooserPromise = new Promise((resolve, reject) => {
    const h = (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.method === 'Page.fileChooserOpened') {
          ws.removeListener('message', h);
          resolve(msg.params.backendNodeId);
        }
      } catch(e) {}
    };
    ws.on('message', h);
    setTimeout(() => { ws.removeListener('message', h); reject(new Error('Timeout file chooser')); }, 25000);
  });

  // Clic en Crear
  console.log('🖱️ Clic en Crear...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const el = Array.from(document.querySelectorAll('a,button,span,div')).find(e => {
        const a=(e.getAttribute('aria-label')||'').toLowerCase();
        const t=(e.textContent||'').toLowerCase().trim();
        const r=e.getBoundingClientRect();
        return (a.includes('crear')||t==='crear'||a.includes('create')||t==='create') && r.width>0;
      });
      if(el) el.click();
    })()`
  });
  await wait(2000);

  // Si aparece el menú "Publicación / Reel / Historia", clic en Publicación o Reel
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const el = Array.from(document.querySelectorAll('button,span,[role="menuitem"]')).find(e => {
        const t=(e.textContent||'').trim().toLowerCase();
        return t==='publicación'||t==='post'||t==='reel';
      });
      if(el) el.click();
    })()`
  });
  await wait(1500);

  // Esperar el file chooser
  console.log('⏳ Esperando file chooser...');
  let backendNodeId;
  try {
    backendNodeId = await fileChooserPromise;
    console.log('✅ File chooser interceptado. NodeId:', backendNodeId);
  } catch(err) {
    console.log('⚠️ Timeout. Buscando input directamente en DOM...');
    await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: false });
    const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
    const res = await cdpCall(ws, 'DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
    if (!res.nodeIds?.length) throw new Error('No se encontró input file en Instagram');
    const ni = await cdpCall(ws, 'DOM.describeNode', { nodeId: res.nodeIds[res.nodeIds.length - 1] });
    backendNodeId = ni.node.backendNodeId;
  }

  console.log('📤 Inyectando video Reel...');
  await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId, files: [VIDEO_PATH] });
  await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: false });
  await wait(8000);

  // Seleccionar recorte si aparece
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('button')).find(b => {
        const t=(b.textContent||'').trim().toLowerCase();
        return t==='seleccionar recorte'||t.includes('recorte')||t.includes('crop');
      });
      if(b) b.click();
    })()`
  });
  await wait(2500);

  // Siguiente (header y < 200)
  console.log('🖱️ Clic en Siguiente...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('button')).find(b => {
        const t=(b.textContent||'').trim().toLowerCase();
        const a=(b.getAttribute('aria-label')||'').toLowerCase();
        const r=b.getBoundingClientRect();
        return (t.includes('siguiente')||a.includes('siguiente')||t==='next') && r.y<200 && r.width>0;
      });
      if(b) b.click();
    })()`
  });
  await wait(3000);

  // Caption
  console.log('✍️ Escribiendo caption...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ta = document.querySelector('textarea');
      if(ta) { ta.focus(); document.execCommand('selectAll',false,null); document.execCommand('insertText',false,${JSON.stringify(CAPTION)}); ta.dispatchEvent(new Event('input',{bubbles:true})); }
    })()`
  });
  await wait(1500);

  // Compartir
  console.log('🚀 Compartiendo...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('button')).find(b => {
        const t=(b.textContent||'').trim().toLowerCase();
        return t==='compartir'||t==='share';
      });
      if(b) b.click();
    })()`
  });
  await wait(9000);

  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\instagram_published.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 instagram_published.png guardado.');
  ws.close();
}

// ============================================================================
// MAIN
// ============================================================================
async function run() {
  console.log('🚀 HYPERION — Publicador Social');
  const tabs = await getTabs();
  const args = process.argv.slice(2);
  const all = args.length === 0;

  if (all || args.includes('facebook') || args.includes('fb')) { await runFacebook(tabs); await wait(3000); }
  if (all || args.includes('tiktok') || args.includes('tt')) { await runTikTok(tabs); await wait(3000); }
  if (all || args.includes('instagram') || args.includes('ig')) { await runInstagram(tabs); }

  console.log('\n🎉 ¡Publicación terminada!');
}

run().catch(console.error);
