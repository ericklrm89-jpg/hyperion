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

async function runFastPhotoSend() {
  console.log('⚡ Inicio rápido de Foto HD...');
  const tabs = await getTabs();
  const wa = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!wa) return console.log('No WhatsApp tab');

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

    // 1. Descartar cualquier modal previo
    await call('Runtime.evaluate', {
      expression: `(() => {
        const closeBtn = document.querySelector('div[aria-label="Cerrar"]') || 
                         document.querySelector('span[data-icon="x"]');
        if (closeBtn) closeBtn.closest('button, div[role="button"]').click();
      })()`
    });
    await new Promise(r => setTimeout(r, 500));

    // 2. Abrir chat haciendo clic directo en el primer chat o buscador
    console.log('1. Abriendo chat en la lista...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const firstChat = document.querySelector('#pane-side div[role="listitem"]') ||
                          document.querySelector('div[data-testid="cell-frame-container"]');
        if (firstChat) firstChat.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    // 3. Abrir menú de adjuntos (+)
    console.log('2. Abriendo menú (+) en el chat...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const plus = document.querySelector('span[data-icon="plus"]') || 
                     document.querySelector('span[data-icon="attach-menu-plus"]');
        if (plus) plus.closest('button, div[role="button"]').click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    // 4. Inyectar imagen en el input de archivo de Fotos
    console.log('3. Inyectando flyer en input de archivo...');
    const doc = await call('DOM.getDocument', { depth: -1, pierce: true });
    const fileInputs = await call('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
    const nodeIds = fileInputs.nodeIds || [];

    if (nodeIds.length > 0) {
      const desc = await call('DOM.describeNode', { nodeId: nodeIds[0] });
      const backendId = desc.node?.backendNodeId;
      console.log(`Backend ID seleccionado: ${backendId}`);
      if (backendId && fs.existsSync(FLYER)) {
        await call('DOM.setFileInputFiles', { backendNodeId: backendId, files: [FLYER] });
        await new Promise(r => setTimeout(r, 3500));

        // 5. Capturar editor
        console.log('4. Capturando vista del editor...');
        const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
        if (snap?.data) {
          const out = path.join(ASSETS_DIR, 'live_wa_editor_preview_working.jpg');
          fs.writeFileSync(out, Buffer.from(snap.data, 'base64'));
          console.log('📸 Editor capturado en:', out);
        }

        // 6. Enviar
        console.log('5. Clic en Enviar Foto...');
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

        // 7. Captura final
        const snapFinal = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
        if (snapFinal?.data) {
          const outFinal = path.join(ASSETS_DIR, 'live_wa_verified_photo_sent.jpg');
          fs.writeFileSync(outFinal, Buffer.from(snapFinal.data, 'base64'));
          console.log('✅ FOTO HD ENVIADA Y GUARDADA EN:', outFinal);
        }
      }
    }

    ws.close();
    process.exit(0);
  });
}

runFastPhotoSend();
