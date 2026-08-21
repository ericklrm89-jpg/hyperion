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

async function testPhotoSend() {
  console.log('🧪 Iniciando prueba de envío como FOTO HD REAL (No Sticker)...');
  const tabs = await getTabs();
  const wa = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!wa) return console.log('No WhatsApp page found');

  const ws = new WebSocket(wa.webSocketDebuggerUrl);
  ws.on('open', async () => {
    const call = (method, params = {}) => new Promise((resolve, reject) => {
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

    // 1. Seleccionar chat Tú
    console.log('1. Seleccionando chat Tú...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const chatRows = Array.from(document.querySelectorAll('div[role="listitem"]'));
        const tu = chatRows.find(c => c.innerText && (c.innerText.includes('Tú') || c.innerText.includes('8229')));
        if (tu) tu.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1500));

    // 2. Hacer clic en botón de Adjuntar (+) para desplegar las opciones nativas
    console.log('2. Desplegando menú Adjuntar (+)...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const plus = document.querySelector('span[data-icon="plus"]') || 
                     document.querySelector('span[data-icon="attach-menu-plus"]') ||
                     document.querySelector('div[title*="Adjuntar"]') ||
                     document.querySelector('button[aria-label*="Adjuntar"]');
        if (plus) plus.closest('button, div[role="button"]').click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    // 3. Inspeccionar todos los inputs de archivo ahora que el menú está desplegado
    console.log('3. Buscando input exclusivo para Fotos y Videos...');
    const doc = await call('DOM.getDocument', { depth: -1, pierce: true });
    const allInputs = await call('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
    const nodeIds = allInputs.nodeIds || [];

    console.log(`Encontrados ${nodeIds.length} inputs de archivo en el DOM.`);

    let targetBackendId = null;
    for (const nid of nodeIds) {
      const desc = await call('DOM.describeNode', { nodeId: nid });
      const attrs = desc.node?.attributes || [];
      // Buscar atributos accept
      const acceptIdx = attrs.indexOf('accept');
      const acceptVal = acceptIdx !== -1 ? attrs[acceptIdx + 1] : '';
      console.log(`- Input nodeId ${nid}, backendId ${desc.node?.backendNodeId}, accept: "${acceptVal}"`);

      // Queremos el que acepta imágenes/video (Fotos y videos), NO sticker
      if (acceptVal.includes('image') && !acceptVal.includes('sticker') && acceptVal !== '*') {
        targetBackendId = desc.node?.backendNodeId;
        console.log(`  👉 SELECCIONADO PARA FOTOS: backendId ${targetBackendId}`);
        break;
      }
    }

    if (!targetBackendId && nodeIds.length > 0) {
      // Si no tiene accept específico, tomar el primero (Fotos y videos suele ser el primero en el popup)
      const desc = await call('DOM.describeNode', { nodeId: nodeIds[0] });
      targetBackendId = desc.node?.backendNodeId;
      console.log(`  👉 Fallback al primer input: backendId ${targetBackendId}`);
    }

    if (targetBackendId && fs.existsSync(FLYER)) {
      console.log(`4. Inyectando ${FLYER} en el input de FOTOS...`);
      await call('DOM.setFileInputFiles', { backendNodeId: targetBackendId, files: [FLYER] });
      await new Promise(r => setTimeout(r, 4000));

      // 5. Tomar captura del visor de fotos (editor de envío)
      console.log('5. Capturando vista previa del editor de fotos...');
      const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
      if (snap?.data) {
        const out = path.join(ASSETS_DIR, 'live_wa_photo_preview_modal.jpg');
        fs.writeFileSync(out, Buffer.from(snap.data, 'base64'));
        console.log('📸 Captura del editor guardada en:', out);
      }
    }

    ws.close();
    process.exit(0);
  });
}

testPhotoSend();
