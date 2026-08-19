const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const VIDEO_PATH = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fabro-video-fixed.mp4';
if (!fs.existsSync(VIDEO_PATH)) throw new Error('Video no encontrado');

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

    // 4. Inyectar el video directamente
    console.log('Inyectando video directamente...');
    await cdpCall(ws, 'DOM.setFileInputFiles', {
      backendNodeId,
      files: [VIDEO_PATH]
    });
    console.log('✅ Inyección completada.');

    // Esperar a que se procese e inicie la pantalla siguiente
    console.log('Esperando procesamiento de video...');
    await wait(8000);

    // Tomar screenshot
    await cdpCall(ws, 'Page.enable');
    const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('fb_reels_direct.png', Buffer.from(ss.data, 'base64'));
    console.log('Screenshot guardado en fb_reels_direct.png');

    ws.close();
  });
});
