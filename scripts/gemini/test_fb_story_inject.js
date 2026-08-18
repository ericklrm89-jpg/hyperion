const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const IMAGE_PATH = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_official_logo_1784899306001.png';
if (!fs.existsSync(IMAGE_PATH)) throw new Error('Imagen no encontrada');

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

http.get('http://localhost:9222/json', r => {
  let d = ''; r.on('data', c => d += c);
  r.on('end', async () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('facebook.com'));
    if (!tab) { console.log('No Facebook tab'); return; }

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(res => ws.on('open', res));
    console.log('WS open');

    // 1. Obtener el root node del DOM
    console.log('Obteniendo documento raíz...');
    const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
    const rootNodeId = doc.root.nodeId;

    // 2. Buscar el elemento input[type="file"]
    console.log('Buscando input[type="file"]...');
    const queryRes = await cdpCall(ws, 'DOM.querySelector', {
      nodeId: rootNodeId,
      selector: 'input[type="file"]'
    });

    if (!queryRes.nodeId) {
      console.log('❌ input[type="file"] no encontrado');
      ws.close();
      return;
    }
    console.log('input[type="file"] encontrado con nodeId:', queryRes.nodeId);

    // 3. Obtener el backendNodeId del nodo
    const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId: queryRes.nodeId });
    const backendNodeId = nodeInfo.node.backendNodeId;
    console.log('backendNodeId resuelto:', backendNodeId);

    // 4. Inyectar la imagen directamente
    console.log('Inyectando imagen para historia...');
    await cdpCall(ws, 'DOM.setFileInputFiles', {
      backendNodeId,
      files: [IMAGE_PATH]
    });
    console.log('✅ Inyección completada.');

    // Esperar procesamiento de la historia
    console.log('Esperando procesamiento de la historia...');
    await wait(6000);

    // Tomar screenshot
    await cdpCall(ws, 'Page.enable');
    const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('fb_stories_injected.png', Buffer.from(ss.data, 'base64'));
    console.log('Screenshot guardado en fb_stories_injected.png');

    // Volcar elementos de la pantalla posterior
    const dump = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const els = Array.from(document.querySelectorAll('button, a, input, textarea, [role="button"], [role="link"], [role="textbox"], div[contenteditable="true"]'));
        const visible = els.filter(e => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.top < 1500;
        }).map(e => {
          const r = e.getBoundingClientRect();
          return {
            tag: e.tagName,
            text: (e.textContent||'').trim().replace(/\\s+/g, ' ').slice(0, 40),
            aria: e.getAttribute('aria-label'),
            x: Math.round(r.left + r.width/2),
            y: Math.round(r.top + r.height/2),
            w: Math.round(r.width),
            h: Math.round(r.height)
          };
        });
        return visible.map(e => JSON.stringify(e)).join('\\n');
      })()`,
      returnByValue: true
    });
    console.log('\n=== STORIES STEP 2 ELEMENTS ===');
    console.log(dump?.result?.value || '(none)');

    ws.close();
  });
});
