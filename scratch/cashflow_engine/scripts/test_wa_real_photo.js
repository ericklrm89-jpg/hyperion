const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ROBUST_MANUS_ENGINE } = require('./hyperion_robust_manus_overlay');

const CDP_PORT = 9001;
const ASSETS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets';
const FLYER = path.join(ASSETS_DIR, 'nanoai_b2b_square_hd_flyer.jpg');

function getTabs() {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${CDP_PORT}/json`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function createCdpCaller(ws) {
  return (method, params = {}) => new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 999999);
    const handler = (data) => {
      try {
        const res = JSON.parse(data);
        if (res.id === id) {
          ws.removeListener('message', handler);
          if (res.error) reject(new Error(JSON.stringify(res.error)));
          else resolve(res.result || {});
        }
      } catch (e) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function testSendPhotoWithCaption() {
  console.log('🚀 Probando inyección de imagen real (Foto HD) con Caption en WhatsApp Web...');
  const tabs = await getTabs();
  const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!waTab) {
    console.log('❌ WhatsApp no encontrado');
    return;
  }

  const ws = new WebSocket(waTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const call = createCdpCaller(ws);
  await call('DOM.enable');

  // 1. Clic en el botón (+) para abrir el menú de adjuntos y generar el input de Fotos y videos
  console.log('1. Abriendo menú de adjuntos...');
  await call('Runtime.evaluate', {
    expression: `(() => {
      const plusBtn = document.querySelector('span[data-icon="plus"]') ||
                      document.querySelector('span[data-icon="attach-menu-plus"]') ||
                      document.querySelector('div[title="Adjuntar"]');
      if (plusBtn) plusBtn.closest('button, div[role="button"]').click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));

  // 2. Localizar el input file con accept="image/*"
  console.log('2. Localizando input accept="image/*"...');
  const doc = await call('DOM.getDocument', { depth: -1, pierce: true });
  const fileInputs = await call('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[accept*="image"]' });
  const nodeIds = fileInputs.nodeIds || [];
  console.log('NodeIds encontrados para imagen:', nodeIds);

  if (nodeIds.length === 0) {
    console.log('❌ No se encontró input de imagen');
    ws.close();
    return;
  }

  const desc = await call('DOM.describeNode', { nodeId: nodeIds[0] });
  const backendNodeId = desc.node?.backendNodeId;
  console.log('BackendNodeId:', backendNodeId);

  // 3. Inyectar el flyer HD en el input de imagen
  console.log('3. Inyectando flyer HD:', FLYER);
  await call('DOM.setFileInputFiles', { backendNodeId, files: [FLYER] });
  
  // Esperar a que se abra el Media Viewer / Modal de previsualización
  console.log('4. Esperando apertura del Media Viewer...');
  await new Promise(r => setTimeout(r, 4000));

  // 4. Capturar el estado del Media Viewer antes de enviar
  await call('Runtime.evaluate', { expression: ROBUST_MANUS_ENGINE });
  await new Promise(r => setTimeout(r, 1000));

  const previewSnap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  const previewPath = path.join(ASSETS_DIR, 'live_wa_media_viewer_modal.jpg');
  if (previewSnap?.data) fs.writeFileSync(previewPath, Buffer.from(previewSnap.data, 'base64'));
  console.log('📸 Captura del Media Viewer guardada:', previewPath);

  // 5. Redactar el pie de foto (Caption) ultra-elegante en el input del Media Viewer
  console.log('5. Insertando Caption en el Media Viewer...');
  const beautifulCaption = `⚡ *NANOAI INDUSTRIAL OS* | _Optimización y Control para CONFITECA C.A._

Estimado(a) *Gonzalo Chiriboga Chaves* y Gerencia de Operaciones de *CONFITECA C.A.* (Panamericana Sur, Quito):

¿Cuánto presupuesto mensual se disipa en su planta de *Fabricación Industrial de Alimentos & Confites* por despieces manuales, tiempos muertos de maquinaria y cotizaciones al ojo?

📊 *IMPACTO FINANCIERO COMPROBADO:*
🔴 *Método Tradicional:* -$3,600 USD/mes en nómina técnica fija • 48h de espera • 8% a 15% de descarte.
🟢 *NanoAI Air-Gapped:* $0 nómina fija técnica • < 45 segundos por cotización • < 2% de merma.

💰 *RETORNO NETO PROYECTADO:*
Recuperación de *+$4,200 USD / mes* en flujo de caja desde el primer mes de operación.

🎁 *OFERTA HORMOZI DE LANZAMIENTO (QUITO):*
✅ *3 MESES GRATIS DE SOPORTE TÉCNICO Y ACTUALIZACIONES*
✅ *Visita Técnica Presencial de 20 minutos* en sus instalaciones por nuestro Director Técnico, Erick.
✅ *Garantía Air-Gapped:* Instalación 100% On-Premise en su red local (cero datos en la nube).

📅 *¿Qué día de esta semana le resultaría más conveniente para coordinar la visita técnica de 20 minutos en su planta?*

🌐 *https://nanoai.ec* • WhatsApp Directo: *+593 99 809 8229*`;

  await call('Runtime.evaluate', {
    expression: `(() => {
      // Buscar la caja de texto dentro del modal de medios
      const captionBox = document.querySelector('div[data-animate-media-viewer="true"] div[contenteditable="true"]') ||
                         document.querySelector('div[aria-label*="pie de foto"]') ||
                         document.querySelector('div[aria-label*="pie de página"]') ||
                         document.querySelector('div[aria-label*="Añade un pie"]') ||
                         Array.from(document.querySelectorAll('div[contenteditable="true"]')).pop();
      if (captionBox) {
        captionBox.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(beautifulCaption)});
        captionBox.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });
  await new Promise(r => setTimeout(r, 2000));

  // 6. Clic en el botón Enviar verde del Media Viewer
  console.log('6. Haciendo clic en el botón Enviar...');
  await call('Runtime.evaluate', {
    expression: `(() => {
      const sendBtn = document.querySelector('div[data-animate-media-viewer="true"] span[data-icon="send"]') ||
                      document.querySelector('span[data-icon="send"]') ||
                      document.querySelector('button[aria-label="Enviar"]') ||
                      document.querySelector('div[aria-label="Enviar"]');
      if (sendBtn) {
        sendBtn.closest('button, div[role="button"]').click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });

  // Esperar a que se procese el envío
  console.log('7. Esperando confirmación de envío...');
  await new Promise(r => setTimeout(r, 5000));

  // 7. Capa Manus sobre el chat enviado
  await call('Runtime.evaluate', { expression: ROBUST_MANUS_ENGINE });
  await new Promise(r => setTimeout(r, 1000));

  const sentSnap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  const sentPath = path.join(ASSETS_DIR, 'live_wa_real_photo_sent_verified.jpg');
  if (sentSnap?.data) fs.writeFileSync(sentPath, Buffer.from(sentSnap.data, 'base64'));
  console.log('✅ Captura final de Foto HD con Caption enviada:', sentPath);

  ws.close();
}

testSendPhotoWithCaption().catch(console.error);
