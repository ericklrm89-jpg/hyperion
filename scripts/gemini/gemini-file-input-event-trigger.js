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
        console.log(`2. NodeId de input file: ${res.result.nodeId}. Inyectando los 4 archivos...`);
        ws.send(JSON.stringify({
          id: 5,
          method: 'DOM.setFileInputFiles',
          params: { files: [logoPath, hookPath, corePath, climaxPath], nodeId: res.result.nodeId }
        }));
      }

      if (res.id === 5) {
        console.log('3. Disparando eventos de actualización (change & input) en el selector de archivos...');
        ws.send(JSON.stringify({
          id: 6,
          method: 'Runtime.evaluate',
          params: {
            expression: `
              (function() {
                function deepQuery(root = document) {
                  let list = Array.from(root.querySelectorAll('input[type="file"]'));
                  let all = Array.from(root.querySelectorAll('*'));
                  for (let el of all) {
                    if (el.shadowRoot) list = list.concat(deepQuery(el.shadowRoot));
                  }
                  return list;
                }
                const inputs = deepQuery(document);
                inputs.forEach(inp => {
                  inp.dispatchEvent(new Event('change', { bubbles: true }));
                  inp.dispatchEvent(new Event('input', { bubbles: true }));
                });
                return inputs.length;
              })()
            `
          }
        }));
      }

      if (res.id === 6) {
        console.log('4. Esperando 4 segundos para renderizado de miniaturas...');
        await new Promise(r => setTimeout(r, 4000));
        ws.send(JSON.stringify({ id: 7, method: 'Page.captureScreenshot', params: { format: 'png' } }));
      }

      if (res.id === 7 && res.result) {
        fs.writeFileSync('gemini_file_event_triggered_proof.png', Buffer.from(res.result.data, 'base64'));
        console.log('📸 Captura de verificación con 4 imágenes adjuntas: gemini_file_event_triggered_proof.png');
        process.exit(0);
      }
    });
  });
});
