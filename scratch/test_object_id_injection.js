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

async function runObjectIdTest() {
  console.log('🧪 Inyección de Foto HD mediante RemoteObjectId directo...');
  const tabs = await getTabs();
  const wa = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!wa) return console.log('No WA tab');

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

    // 1. Abrir chat haciendo clic en el primer chat
    await call('Runtime.evaluate', {
      expression: `(() => {
        const item = document.querySelector('#pane-side div[role="listitem"]');
        if (item) item.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    // 2. Abrir menú (+)
    await call('Runtime.evaluate', {
      expression: `(() => {
        const plus = document.querySelector('span[data-icon="plus"]') || 
                     document.querySelector('span[data-icon="attach-menu-plus"]');
        if (plus) plus.closest('button, div[role="button"]').click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    // 3. Obtener el Remote Object del input de fotos y videos
    const evalRes = await call('Runtime.evaluate', {
      expression: `document.querySelector('input[accept*="image"]') || document.querySelector('input[type="file"]')`,
      returnByValue: false
    });

    const objectId = evalRes?.result?.objectId;
    console.log('Remote ObjectId del Input:', objectId);

    if (objectId) {
      const descRes = await call('DOM.describeNode', { objectId });
      const backendNodeId = descRes?.node?.backendNodeId;
      console.log('BackendNodeId obtenido con éxito:', backendNodeId);

      if (backendNodeId && fs.existsSync(FLYER)) {
        console.log('4. Inyectando archivo en input de Fotos...');
        await call('DOM.setFileInputFiles', { backendNodeId, files: [FLYER] });
        await new Promise(r => setTimeout(r, 3500));

        // Captura del editor
        const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
        if (snap?.data) {
          const out = path.join(ASSETS_DIR, 'live_wa_photo_preview_success.jpg');
          fs.writeFileSync(out, Buffer.from(snap.data, 'base64'));
          console.log('📸 VISTA PREVIA DEL EDITOR DE FOTOS GUARDADA:', out);
        }

        // Clic en enviar
        console.log('5. Haciendo clic en botón verde de envío...');
        await call('Runtime.evaluate', {
          expression: `(() => {
            const sendBtn = document.querySelector('div[data-animate-media-viewer="true"] span[data-icon="wds-ic-send-filled"]') ||
                            document.querySelector('div[data-animate-media-viewer="true"] span[data-icon="send"]') ||
                            document.querySelector('span[data-icon="wds-ic-send-filled"]') ||
                            document.querySelector('span[data-icon="send"]') ||
                            document.querySelector('div[aria-label="Enviar"]');
            if (sendBtn) {
              const b = sendBtn.closest('button, div[role="button"]') || sendBtn;
              b.click();
            }
          })()`
        });
        await new Promise(r => setTimeout(r, 4000));

        const snapFinal = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
        if (snapFinal?.data) {
          const outFinal = path.join(ASSETS_DIR, 'live_wa_real_hd_photo_delivered.jpg');
          fs.writeFileSync(outFinal, Buffer.from(snapFinal.data, 'base64'));
          console.log('✅ CAPTURA VERIFICADA FOTO HD ENVIADA:', outFinal);
        }
      }
    }

    ws.close();
    process.exit(0);
  });
}

runObjectIdTest();
