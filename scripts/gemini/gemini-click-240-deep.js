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
      console.log('1. Disparando clic Angular nativo en el botón [240] (+)...');
      ws.send(JSON.stringify({ id: 1, method: 'Page.bringToFront' }));

      ws.send(JSON.stringify({
        id: 2,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            (function() {
              function getAllDeepElements(root = document) {
                let els = Array.from(root.querySelectorAll('*'));
                for (let el of Array.from(root.querySelectorAll('*'))) {
                  if (el.shadowRoot) els = els.concat(getAllDeepElements(el.shadowRoot));
                }
                return els;
              }
              const all = getAllDeepElements(document);
              const plusBtn = all.find(e => {
                const aria = (e.getAttribute('aria-label') || '').toLowerCase();
                const title = (e.getAttribute('title') || '').toLowerCase();
                return (aria.includes('subir') || aria.includes('upload') || aria.includes('añadir') || title.includes('subida')) && e.offsetWidth > 0;
              });

              if (plusBtn) {
                plusBtn.click();
                plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
                plusBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                return { clicked: true, tag: plusBtn.tagName };
              }
              return { clicked: false };
            })()
          `
        }
      }));

      await new Promise(r => setTimeout(r, 1500));

      // Query input file node via CDP and set 4 files
      ws.send(JSON.stringify({ id: 3, method: 'DOM.getDocument', params: { depth: -1, pierce: true } }));
    });

    ws.on('message', async msg => {
      const res = JSON.parse(msg);
      if (res.id === 2) console.log('Resultado clic 240:', res.result.value);

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
        console.log('✅ 4 Imágenes inyectadas.');
        await new Promise(r => setTimeout(r, 3000));
        ws.send(JSON.stringify({ id: 6, method: 'Page.captureScreenshot', params: { format: 'png' } }));
      }

      if (res.id === 6 && res.result) {
        fs.writeFileSync('gemini_240_deep_clicked_proof.png', Buffer.from(res.result.data, 'base64'));
        console.log('📸 Captura guardada: gemini_240_deep_clicked_proof.png');
        process.exit(0);
      }
    });
  });
});
