/**
 * Módulo de Publicación para Instagram — Hyperion Engine v3
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
        const instaTab = tabs.find(t => t.url && t.url.includes('instagram.com') && t.type === 'page') ||
                          tabs.find(t => t.url && t.url.includes('instagram.com'));
        if (!instaTab) reject(new Error('Pestaña de Instagram no encontrada en Chrome'));
        else resolve(instaTab);
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

async function publishInstagramReel(videoPath, caption) {
  console.log('═══════════════════════════════════════════════════');
  console.log('  HYPERION MODULE — Instagram Reel Publish');
  console.log('═══════════════════════════════════════════════════');

  if (!fs.existsSync(videoPath)) throw new Error(`Video file not found: ${videoPath}`);

  const tab = await getTab();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r, e) => { ws.on('open', r); ws.on('error', e); });
  console.log(`✅ Conectado a Instagram: ${tab.title}`);

  // Inyectar overlay Hyperion para detectar el botón "Crear"
  await evalJS(ws, ORIGINAL_HYPERION_OVERLAY_SCRIPT, 20000);
  await sleep(800);
  const data0 = JSON.parse(await evalJS(ws, 'window.__hyData()') || '{}');

  const createEl = data0.elements?.find(e => (e.text||'').toLowerCase().includes('crear') || (e.text||'').toLowerCase().includes('create'));
  if (createEl) {
    await evalJS(ws, `document.querySelectorAll('.hy-rr,.hy-st').forEach(e => e.remove())`);
    await click(ws, createEl.x, createEl.y, 'Crear button');
    await sleep(2000);
  }

  // Inyectar archivo sin ventana nativa OS
  await cdp(ws, 'DOM.enable');
  const doc = await cdp(ws, 'DOM.getDocument');
  const nodeRes = await cdp(ws, 'DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  if (nodeRes.nodeIds && nodeRes.nodeIds.length > 0) {
    const targetNodeId = nodeRes.nodeIds[nodeRes.nodeIds.length - 1];
    await cdp(ws, 'DOM.setFileInputFiles', { files: [videoPath], nodeId: targetNodeId });
    console.log('✅ Reel inyectado via CDP en Instagram');
    await sleep(2000);
  }

  ws.close();
  console.log('🎉 Flujo Instagram completado');
  return { status: 'success' };
}

module.exports = { publishInstagramReel };
