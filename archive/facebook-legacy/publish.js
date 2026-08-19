/**
 * Módulo de Publicación para Facebook — Hyperion Engine v3
 */
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');

const { ORIGINAL_HYPERION_OVERLAY_SCRIPT } = require('../../dist/layers/overlay');

async function getTab() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => {
        const tabs = JSON.parse(data);
        const fbTab = tabs.find(t => t.url && t.url.includes('facebook.com') && t.type === 'page') ||
                      tabs.find(t => t.url && t.url.includes('facebook.com'));
        if (!fbTab) reject(new Error('Pestaña de Facebook no encontrada en Chrome'));
        else resolve(fbTab);
      });
    }).on('error', reject);
  });
}

let _id = 1;
async function cdp(ws, method, params = {}, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const id = _id++;
    const timer = setTimeout(() => { ws.off('message', h); reject(new Error(`Timeout: ${method}`)); }, timeoutMs);
    const h = data => {
      const r = JSON.parse(data.toString());
      if (r.id === id) { clearTimeout(timer); ws.off('message', h); r.error ? reject(new Error(r.error.message)) : resolve(r.result); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function evalJS(ws, expr, timeoutMs = 15000) {
  const r = await cdp(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: false, userGesture: true }, timeoutMs);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result?.value;
}

async function click(ws, x, y, label = '') {
  console.log(`  🖱️ Click ${label ? `[${label}]` : ''} @ (${x}, ${y})`);
  await cdp(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await sleep(100);
  await cdp(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function publishFacebookVideo(videoPath, caption) {
  console.log('═══════════════════════════════════════════════════');
  console.log('  HYPERION MODULE — Facebook Video Publish');
  console.log('═══════════════════════════════════════════════════');

  if (!fs.existsSync(videoPath)) throw new Error(`Video file not found: ${videoPath}`);

  const tab = await getTab();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r, e) => { ws.on('open', r); ws.on('error', e); });
  console.log(`✅ Conectado a Facebook: ${tab.title}`);

  // Limpiar overlay anterior si existe
  await evalJS(ws, `document.querySelectorAll('.hy-rr,.hy-st').forEach(e => e.remove())`);

  // Ir a Home si estamos en subpágina
  const isIndividual = await evalJS(ws, `location.href.includes('/photo') || location.href.includes('/posts/')`);
  if (isIndividual) {
    await evalJS(ws, `location.href = 'https://www.facebook.com/'`);
    await sleep(4000);
  }

  // Abrir compositor si no está abierto
  const hasModal = await evalJS(ws, `!!document.querySelector('[role="dialog"]')`);
  if (!hasModal) {
    await click(ws, 974, 104, "What's on your mind");
    await sleep(2500);
  }

  // Click Photo/video icon
  const pvPos = await evalJS(ws, `
    (function() {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return { x: 1019, y: 681 };
      const btn = Array.from(d.querySelectorAll('[role="button"]')).find(b => (b.getAttribute('aria-label')||'').toLowerCase().includes('photo/video') || (b.textContent||'').toLowerCase().includes('photo/video'));
      if (btn) { const r = btn.getBoundingClientRect(); return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) }; }
      return { x: 1019, y: 681 };
    })()
  `);
  await click(ws, pvPos.x, pvPos.y, 'Photo/video icon');
  await sleep(1500);

  // Inyectar archivo sin picker OS
  await cdp(ws, 'DOM.enable');
  const doc = await cdp(ws, 'DOM.getDocument');
  const nodeRes = await cdp(ws, 'DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  if (nodeRes.nodeIds && nodeRes.nodeIds.length > 0) {
    const targetNodeId = nodeRes.nodeIds[nodeRes.nodeIds.length - 1];
    await cdp(ws, 'DOM.setFileInputFiles', { files: [videoPath], nodeId: targetNodeId });
    await evalJS(ws, `
      const inputs = document.querySelectorAll('input[type="file"]');
      const input = inputs[inputs.length - 1];
      if (input) { input.dispatchEvent(new Event('change', { bubbles: true })); input.dispatchEvent(new Event('input', { bubbles: true })); }
    `);
    console.log('✅ Video inyectado via CDP');
  }

  // Caption
  const textPos = await evalJS(ws, `
    (function() {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return { x: 760, y: 244 };
      const tb = d.querySelector('[contenteditable="true"]') || d.querySelector('[role="textbox"]');
      if (tb) { const r = tb.getBoundingClientRect(); return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + 20) }; }
      return { x: 760, y: 244 };
    })()
  `);
  await click(ws, textPos.x, textPos.y, 'Text box');
  await sleep(400);
  await cdp(ws, 'Input.insertText', { text: caption });
  console.log('✅ Caption escrito');

  // Next / Post con Hyperion Overlay v3
  await sleep(3000);
  await evalJS(ws, ORIGINAL_HYPERION_OVERLAY_SCRIPT, 20000);
  await sleep(1000);
  const data1 = JSON.parse(await evalJS(ws, 'window.__hyData()') || '{}');
  const nextBtn = data1.elements?.find(e => (e.text||'').toLowerCase().includes('next'));
  const nextX = nextBtn ? nextBtn.x : 1014;
  const nextY = nextBtn ? nextBtn.y : 784;

  await evalJS(ws, `document.querySelectorAll('.hy-rr,.hy-st').forEach(e => e.remove())`);
  await click(ws, nextX, nextY, 'Next');
  await sleep(4000);

  // Pantalla 2 (Edit reel si existe)
  await evalJS(ws, ORIGINAL_HYPERION_OVERLAY_SCRIPT, 20000);
  await sleep(1000);
  const data2 = JSON.parse(await evalJS(ws, 'window.__hyData()') || '{}');
  const next2 = data2.elements?.find(e => (e.text||'').toLowerCase().includes('next'));
  if (next2) {
    await evalJS(ws, `document.querySelectorAll('.hy-rr,.hy-st').forEach(e => e.remove())`);
    await click(ws, next2.x, next2.y, 'Next #2');
    await sleep(4000);
    await evalJS(ws, ORIGINAL_HYPERION_OVERLAY_SCRIPT, 20000);
    await sleep(1000);
  }

  // Click Post
  const data3 = JSON.parse(await evalJS(ws, 'window.__hyData()') || '{}');
  const postBtn = data3.elements?.find(e => (e.text||'').toLowerCase().includes('post') || (e.text||'').toLowerCase().includes('share'));
  const postX = postBtn ? postBtn.x : 388;
  const postY = postBtn ? postBtn.y : 878;

  await evalJS(ws, `document.querySelectorAll('.hy-rr,.hy-st').forEach(e => e.remove())`);
  await click(ws, postX, postY, 'Post');
  console.log('⏳ Procesando publicación...');
  await sleep(12000);

  ws.close();
  console.log('🎉 Publicación en Facebook completada exitosamente');
  return { status: 'success' };
}

module.exports = { publishFacebookVideo };

if (require.main === module) {
  const video = process.argv[2] || 'C:\\Users\\erick\\Downloads\\WhatsApp Video 2026-07-16 at 9.00.38 PM.mp4';
  const text = process.argv[3] || 'Sorteos transparentes y automáticos para TikTok e Instagram con FairDraw App 🎉🎁 #FairDraw';
  publishFacebookVideo(video, text).catch(console.error);
}
