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
      console.log('1. Clickeando el botón [241] (+) mediante CDP dispatchMouseEvent a (396, 502)...');
      ws.send(JSON.stringify({ id: 1, method: 'Page.bringToFront' }));
      ws.send(JSON.stringify({ id: 2, method: 'DOM.enable' }));

      // Dispatch CDP click to badge [241] centroid
      ws.send(JSON.stringify({
        id: 3,
        method: 'Input.dispatchMouseEvent',
        params: { type: 'mousePressed', x: 396, y: 502, button: 'left', clickCount: 1 }
      }));
      ws.send(JSON.stringify({
        id: 4,
        method: 'Input.dispatchMouseEvent',
        params: { type: 'mouseReleased', x: 396, y: 502, button: 'left', clickCount: 1 }
      }));

      await new Promise(r => setTimeout(r, 1500));

      // Capture menu opened screenshot
      ws.send(JSON.stringify({ id: 5, method: 'Page.captureScreenshot', params: { format: 'png' } }));
    });

    ws.on('message', async msg => {
      const res = JSON.parse(msg);
      if (res.id === 5 && res.result) {
        fs.writeFileSync('gemini_menu_opened_live.png', Buffer.from(res.result.data, 'base64'));
        console.log('📸 Captura del menú de carga abierto: gemini_menu_opened_live.png');

        // Query input file and attach 4 files
        ws.send(JSON.stringify({ id: 6, method: 'DOM.getDocument', params: { depth: -1, pierce: true } }));
      }

      if (res.id === 6 && res.result) {
        ws.send(JSON.stringify({
          id: 7,
          method: 'DOM.querySelector',
          params: { nodeId: res.result.root.nodeId, selector: 'input[type="file"]' }
        }));
      }

      if (res.id === 7 && res.result && res.result.nodeId) {
        console.log(`2. NodeId de input file: ${res.result.nodeId}. Inyectando las 4 imágenes...`);
        ws.send(JSON.stringify({
          id: 8,
          method: 'DOM.setFileInputFiles',
          params: { files: [logoPath, hookPath, corePath, climaxPath], nodeId: res.result.nodeId }
        }));
      }

      if (res.id === 8) {
        console.log('✅ 4 Imágenes inyectadas vía CDP.');
        await new Promise(r => setTimeout(r, 3000));
        ws.send(JSON.stringify({ id: 9, method: 'Page.captureScreenshot', params: { format: 'png' } }));
      }

      if (res.id === 9 && res.result) {
        fs.writeFileSync('gemini_4images_attached_live_proof.png', Buffer.from(res.result.data, 'base64'));
        console.log('📸 Captura de prueba con 4 imágenes adjuntas: gemini_4images_attached_live_proof.png');
        process.exit(0);
      }
    });
  });
});
