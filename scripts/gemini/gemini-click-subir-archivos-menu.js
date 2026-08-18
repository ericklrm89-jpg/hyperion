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
      console.log('1. Clickeando el botón (+) de Subir...');
      ws.send(JSON.stringify({ id: 1, method: 'Page.bringToFront' }));
      ws.send(JSON.stringify({ id: 2, method: 'DOM.enable' }));

      // Step 1: Click (+) button
      ws.send(JSON.stringify({
        id: 3,
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
                plusBtn.focus();
                plusBtn.click();
                plusBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                return { plusClicked: true, aria: plusBtn.getAttribute('aria-label') };
              }
              return { plusClicked: false };
            })()
          `
        }
      }));

      await new Promise(r => setTimeout(r, 1500));

      // Step 2: Click the popup menu item "Subir archivos"
      console.log('2. Clickeando el elemento del menú emergente "Subir archivos"...');
      ws.send(JSON.stringify({
        id: 4,
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
              const menuOption = all.find(e => {
                const text = (e.innerText || e.textContent || e.getAttribute('aria-label') || '').toLowerCase();
                return (text.includes('subir archivos') || text.includes('subir desde') || text.includes('upload files') || text.includes('subir de')) && e.offsetWidth > 0;
              });
              if (menuOption) {
                menuOption.focus();
                menuOption.click();
                return { menuClicked: true, text: menuOption.innerText };
              }
              return { menuClicked: false };
            })()
          `
        }
      }));

      await new Promise(r => setTimeout(r, 1000));
      ws.send(JSON.stringify({ id: 5, method: 'DOM.getDocument', params: { depth: -1, pierce: true } }));
    });

    ws.on('message', async msg => {
      const res = JSON.parse(msg);
      if (res.id === 3) console.log('Resultado (+):', res.result.value);
      if (res.id === 4) console.log('Resultado Opción Menú:', res.result.value);

      if (res.id === 5 && res.result) {
        ws.send(JSON.stringify({
          id: 6,
          method: 'DOM.querySelector',
          params: { nodeId: res.result.root.nodeId, selector: 'input[type="file"]' }
        }));
      }

      if (res.id === 6 && res.result && res.result.nodeId) {
        console.log(`3. NodeId del input file: ${res.result.nodeId}. Inyectando las 4 imágenes...`);
        ws.send(JSON.stringify({
          id: 7,
          method: 'DOM.setFileInputFiles',
          params: { files: [logoPath, hookPath, corePath, climaxPath], nodeId: res.result.nodeId }
        }));
      }

      if (res.id === 7) {
        console.log('✅ 4 Imágenes inyectadas vía CDP setFileInputFiles.');
        await new Promise(r => setTimeout(r, 4000));
        ws.send(JSON.stringify({ id: 8, method: 'Page.captureScreenshot', params: { format: 'png' } }));
      }

      if (res.id === 8 && res.result) {
        fs.writeFileSync('gemini_4images_attached_confirmed.png', Buffer.from(res.result.data, 'base64'));
        console.log('📸 Captura de confirmación guardada: gemini_4images_attached_confirmed.png');
        process.exit(0);
      }
    });
  });
});
