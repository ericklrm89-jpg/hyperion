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

async function testPerfectPhotoSend() {
  console.log('🚀 TEST DEFINITIVO: Envío de Foto HD con Selector de Fotos y Videos...');
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

    // 1. Abrir chat "Tú"
    console.log('1. Navegando al chat Tú...');
    await call('Runtime.evaluate', {
      expression: `window.location.href = 'https://web.whatsapp.com/send?phone=593998098229';`
    });

    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const chk = await call('Runtime.evaluate', {
        expression: `!!(document.querySelector('footer div[contenteditable="true"]'))`,
        returnByValue: true
      });
      if (chk?.result?.value) {
        console.log(`Chat interactivo listo en ${i+1}s`);
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    // 2. Clic en (+) para desplegar menú de adjuntos
    console.log('2. Abriendo menú de adjuntar (+)...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const plus = document.querySelector('span[data-icon="plus"]') || 
                     document.querySelector('span[data-icon="attach-menu-plus"]') ||
                     document.querySelector('div[title*="Adjuntar"]');
        if (plus) plus.closest('button, div[role="button"]').click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1500));

    // 3. Inspeccionar inputs y elegir el input de Fotos y Videos
    console.log('3. Localizando input exclusivo de Fotos y Videos...');
    const doc = await call('DOM.getDocument', { depth: -1, pierce: true });
    
    // Buscar input dentro de la opción Fotos y videos
    const inputsInfo = await call('Runtime.evaluate', {
      expression: `(() => {
        // En WhatsApp Web, los items del menú de adjuntos están en una lista o contenedor
        const photoItem = document.querySelector('li [data-icon="attach-image"]') ||
                          document.querySelector('span[data-icon="attach-image"]') ||
                          document.querySelector('button[aria-label*="Fotos"]') ||
                          document.querySelector('li[data-animate-dropdown-item="true"]');
        return { found: !!photoItem };
      })()`,
      returnByValue: true
    });

    console.log('Foto Item Encontrado:', JSON.stringify(inputsInfo.result?.value));

    // Obtener todos los inputs de tipo file
    const fileInputs = await call('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
    const nodeIds = fileInputs.nodeIds || [];
    console.log(`Inputs de archivo detectados: ${nodeIds.length}`);

    // Iterar para encontrar el que tiene accept de imágenes o está vinculado a Fotos
    let targetBackendId = null;
    for (const nid of nodeIds) {
      const desc = await call('DOM.describeNode', { nodeId: nid });
      const attrs = desc.node?.attributes || [];
      const acceptIdx = attrs.indexOf('accept');
      const acceptVal = acceptIdx !== -1 ? attrs[acceptIdx + 1] : '';
      console.log(`Input nid: ${nid}, backendId: ${desc.node?.backendNodeId}, accept: "${acceptVal}"`);

      // El input de Fotos y Videos tiene accept con "image/*" o "video/*"
      if (acceptVal.includes('image') || acceptVal.includes('video') || acceptVal === '*') {
        targetBackendId = desc.node?.backendNodeId;
        console.log(`👉 Backend ID seleccionado para Foto HD: ${targetBackendId}`);
        break;
      }
    }

    if (targetBackendId && fs.existsSync(FLYER)) {
      console.log(`4. Inyectando ${FLYER}...`);
      await call('DOM.setFileInputFiles', { backendNodeId: targetBackendId, files: [FLYER] });
      await new Promise(r => setTimeout(r, 4000));

      // 5. Capturar editor
      console.log('5. Capturando editor multimedia...');
      const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
      if (snap?.data) {
        const out = path.join(ASSETS_DIR, 'live_wa_editor_preview_test.jpg');
        fs.writeFileSync(out, Buffer.from(snap.data, 'base64'));
        console.log('📸 Editor capturado en:', out);
      }

      // 6. Enviar
      console.log('6. Enviando Foto HD...');
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
      await new Promise(r => setTimeout(r, 5000));

      // 7. Captura final del chat enviado
      const snapFinal = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
      if (snapFinal?.data) {
        const outFinal = path.join(ASSETS_DIR, 'live_wa_final_photo_delivered.jpg');
        fs.writeFileSync(outFinal, Buffer.from(snapFinal.data, 'base64'));
        console.log('✅ CAPTURA FINAL ENVIADA GUARDADA EN:', outFinal);
      }
    }

    ws.close();
    process.exit(0);
  });
}

testPerfectPhotoSend();
