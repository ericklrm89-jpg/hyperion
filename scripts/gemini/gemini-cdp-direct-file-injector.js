const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

// 4 Image Assets
const logoPath = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_official_logo_1784899306001.png';
const hookPath = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_3d_new_hook_1784899716687.png';
const corePath = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_3d_new_core_1784899732605.png';
const climaxPath = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_3d_new_climax_1784899748976.png';

http.get('http://localhost:9222/json', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    const tabs = JSON.parse(data);
    const t = tabs.find(x => x.type === 'page' && x.url.includes('gemini.google.com') && !x.url.includes('RotateCookiesPage'));
    if (!t) return console.log('Tab no encontrada');

    const ws = new WebSocket(t.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('1. Obteniendo árbol DOM CDP pierced...');
      ws.send(JSON.stringify({ id: 1, method: 'Page.bringToFront' }));
      ws.send(JSON.stringify({ id: 2, method: 'DOM.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'DOM.getDocument', params: { depth: -1, pierce: true } }));
    });

    ws.on('message', async msg => {
      const res = JSON.parse(msg);
      if (res.id === 3 && res.result) {
        ws.send(JSON.stringify({
          id: 4,
          method: 'DOM.querySelector',
          params: { nodeId: res.result.root.nodeId, selector: 'input[type="file"]' }
        }));
      }

      if (res.id === 4 && res.result && res.result.nodeId) {
        console.log(`2. NodeId de input file: ${res.result.nodeId}. Inyectando las 4 imágenes...`);
        ws.send(JSON.stringify({
          id: 5,
          method: 'DOM.setFileInputFiles',
          params: { files: [logoPath, hookPath, corePath, climaxPath], nodeId: res.result.nodeId }
        }));
      }

      if (res.id === 5) {
        console.log('3. Inyección realizada. Forzando foco y actualización de estado en Gemini...');
        // Dispatch key/click events to trigger file attachment state change
        ws.send(JSON.stringify({
          id: 6,
          method: 'DOM.querySelector',
          params: { nodeId: 1, selector: 'div[contenteditable="true"]' }
        }));
      }

      if (res.id === 6) {
        await new Promise(r => setTimeout(r, 4000));
        ws.send(JSON.stringify({ id: 7, method: 'Page.captureScreenshot', params: { format: 'png' } }));
      }

      if (res.id === 7 && res.result) {
        fs.writeFileSync('gemini_cdp_direct_attached.png', Buffer.from(res.result.data, 'base64'));
        console.log('📸 Captura de confirmación guardada: gemini_cdp_direct_attached.png');
        process.exit(0);
      }
    });
  });
});
