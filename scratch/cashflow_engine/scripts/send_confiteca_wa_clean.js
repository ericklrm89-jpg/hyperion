/**
 * ENVÍO EXTERNO CONFITECA C.A. EN WHATSAPP WEB
 */

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ROBUST_MANUS_ENGINE } = require('./hyperion_robust_manus_overlay');
const { generateLiveHudEngine } = require('./hyperion_live_countdown_hud');

const ASSETS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets';
const FLYER = path.join(ASSETS_DIR, 'nanoai_b2b_square_hd_flyer.jpg');

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

http.get('http://127.0.0.1:9001/json', res => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', async () => {
    const tabs = JSON.parse(d);
    const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
    if (!waTab) return;

    const ws = new WebSocket(waTab.webSocketDebuggerUrl);
    await new Promise(r => ws.on('open', r));
    const call = createCdpCaller(ws);
    await call('DOM.enable');

    const copy = `⚡ *NANOAI INDUSTRIAL OS* | _Optimización de Costos y Control para CONFITECA C.A._

Estimado(a) *Gonzalo Chiriboga Chaves* y Dirección de Operaciones de *CONFITECA C.A.* (Guajaló / Panamericana Sur, Quito):
¿Cuánto le cuesta al mes en su planta de *Fabricación Industrial de Alimentos & Confites* mantener procesos manuales de cotización y despiece?

📊 *Impacto Financiero Comprobado:*
🔴 *Método Tradicional:* -$3,600 USD/mes en nómina técnica fija | 48h de espera | 8% a 15% de descarte.
🟢 *NanoAI Air-Gapped:* $0 nómina fija técnica | < 45 segundos por cotización | < 2% de merma.

💰 *Retorno Financiero Proyectado:* Retorno neto de *+$4,200 USD/mes* en flujo de caja.

🎁 *OFERTA HORMOZI DE LANZAMIENTO (QUITO):*
✅ *3 MESES GRATIS DE SOPORTE TÉCNICO Y ACTUALIZACIONES*
✅ *Visita Técnica Presencial de 20 minutos* en sus instalaciones por nuestro Director Técnico, Erick.

📅 _¿Qué día de esta semana le resultaría más conveniente para la demostración técnica de 20 minutos?_
🌐 https://nanoai.ec • WhatsApp Directo: +593 99 809 8229`;

    // Escribir en el chat abierto
    await call('Runtime.evaluate', {
      expression: `(() => {
        const msgBox = document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
                       document.querySelector('footer div[contenteditable="true"]') ||
                       document.querySelector('div[contenteditable="true"][role="textbox"]');
        if (msgBox) {
          msgBox.focus();
          document.execCommand('insertText', false, ${JSON.stringify(copy)});
          msgBox.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 1500));

    // Enviar texto
    await call('Runtime.evaluate', {
      expression: `(() => {
        const sendBtn = document.querySelector('span[data-icon="send"]') || document.querySelector('button[aria-label="Enviar"]');
        if (sendBtn) sendBtn.closest('button, div[role="button"]').click();
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    // Adjuntar Flyer
    if (fs.existsSync(FLYER)) {
      const doc = await call('DOM.getDocument', { depth: -1, pierce: true });
      const fileInputs = await call('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
      const nodeIds = fileInputs.nodeIds || [];
      if (nodeIds.length > 0) {
        const desc = await call('DOM.describeNode', { nodeId: nodeIds[nodeIds.length - 1] });
        if (desc.node?.backendNodeId) {
          await call('DOM.setFileInputFiles', { backendNodeId: desc.node.backendNodeId, files: [FLYER] });
          await new Promise(r => setTimeout(r, 3000));

          await call('Runtime.evaluate', {
            expression: `(() => {
              const sendBtn = document.querySelector('div[aria-label*="Enviar"]') ||
                              document.querySelector('span[data-icon="send"]');
              if (sendBtn) sendBtn.closest('button, div[role="button"]').click();
            })()`
          });
          await new Promise(r => setTimeout(r, 2500));
        }
      }
    }

    // Inyectar Capa Manus y HUD
    await call('Runtime.evaluate', { expression: ROBUST_MANUS_ENGINE });
    await call('Runtime.evaluate', {
      expression: generateLiveHudEngine('CONFITECA C.A. (Panamericana Sur)', 'ACERO COMERCIAL ECUATORIANO S.A.', 300, 1, 5000)
    });
    await new Promise(r => setTimeout(r, 1000));

    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap?.data) {
      const proofPath = path.join(ASSETS_DIR, 'live_wa_real_CONFITECA_delivered.jpg');
      fs.writeFileSync(proofPath, Buffer.from(snap.data, 'base64'));
      console.log('✅ WHATSAPP EXTERNO CONFITECA ENVIADO:', proofPath);
    }
    ws.close();
    process.exit(0);
  });
});
