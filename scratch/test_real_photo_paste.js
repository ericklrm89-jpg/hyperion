const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const CDP_PORT = 9001;
const ASSETS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets';
const FLYER = path.join(ASSETS_DIR, 'nanoai_b2b_square_hd_flyer.jpg');

function getTabs() {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${CDP_PORT}/json`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function runTest() {
  console.log('🧪 Abriendo chat garantizado y testeando inyección de FOTO REAL...');
  const tabs = await getTabs();
  const wa = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!wa) return console.log('No WhatsApp page found');

  const ws = new WebSocket(wa.webSocketDebuggerUrl);
  ws.on('open', async () => {
    const call = (method, params = {}) => new Promise((resolve) => {
      const id = Math.floor(Math.random() * 99999);
      const h = (d) => {
        try {
          const j = JSON.parse(d);
          if (j.id === id) {
            ws.removeListener('message', h);
            resolve(j.result);
          }
        } catch(e) {}
      };
      ws.on('message', h);
      ws.send(JSON.stringify({ id, method, params }));
    });

    await call('DOM.enable');
    await call('Page.enable');

    // 1. Usar buscador lateral para abrir el chat del usuario
    console.log('1. Buscando contacto en la barra de búsqueda...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const searchInput = document.querySelector('div[contenteditable="true"][data-tab="3"]') ||
                            document.querySelector('div[role="textbox"]');
        if (searchInput) {
          searchInput.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, '8229');
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    // Clic en el primer resultado
    console.log('2. Haciendo clic en el primer resultado...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const firstResult = document.querySelector('div[role="listitem"]') || 
                            document.querySelector('div[data-testid="cell-frame-container"]');
        if (firstResult) firstResult.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    // 3. Verificar si abrió el chat (#main y footer)
    const chatOpen = await call('Runtime.evaluate', {
      expression: `!!(document.querySelector('#main') && document.querySelector('footer div[contenteditable="true"]'))`,
      returnByValue: true
    });

    console.log('Chat Abierto:', chatOpen.result?.value);

    // 4. Inyectar imagen con el evento Paste nativo sobre el footer
    console.log('3. Inyectando imagen mediante evento Paste con Blob...');
    const imageBase64 = fs.readFileSync(FLYER).toString('base64');

    const pasteRes = await call('Runtime.evaluate', {
      expression: `(async () => {
        const byteChars = atob('${imageBase64}');
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const file = new File([byteArray], 'flyer_propuesta_hd.jpg', { type: 'image/jpeg' });

        const composer = document.querySelector('footer div[contenteditable="true"]');
        if (!composer) return { success: false, reason: 'No composer' };

        composer.focus();
        const dt = new DataTransfer();
        dt.items.add(file);

        const pasteEvt = new ClipboardEvent('paste', {
          clipboardData: dt,
          bubbles: true,
          cancelable: true
        });

        composer.dispatchEvent(pasteEvt);
        return { success: true };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('Paste Result:', JSON.stringify(pasteRes.result?.value));
    await new Promise(r => setTimeout(r, 3000));

    // 5. Captura del visor de fotos
    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap?.data) {
      const out = path.join(ASSETS_DIR, 'live_wa_real_photo_paste_preview.jpg');
      fs.writeFileSync(out, Buffer.from(snap.data, 'base64'));
      console.log('📸 Captura del visor de fotos:', out);
    }

    ws.close();
    process.exit(0);
  });
}

runTest();
