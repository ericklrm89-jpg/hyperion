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

async function testPhotoWithText() {
  console.log('🧪 Probando inyección de TEXTO COMPLETO en el pie de foto de WhatsApp...');
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

    // 1. Abrir chat primer elemento
    console.log('1. Abriendo chat en la lista...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const item = document.querySelector('#pane-side div[role="listitem"]');
        if (item) item.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    // 2. Abrir menú (+)
    console.log('2. Abriendo menú (+) de adjuntos...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const plus = document.querySelector('span[data-icon="plus"]') || 
                     document.querySelector('span[data-icon="attach-menu-plus"]');
        if (plus) plus.closest('button, div[role="button"]').click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    // 3. Inyectar imagen en input
    const evalInput = await call('Runtime.evaluate', {
      expression: `document.querySelector('input[accept*="image"]') || document.querySelector('input[type="file"]')`,
      returnByValue: false
    });

    const objectId = evalInput?.result?.objectId;
    const descRes = await call('DOM.describeNode', { objectId });
    const backendNodeId = descRes?.node?.backendNodeId;

    if (backendNodeId && fs.existsSync(FLYER)) {
      console.log('3. Inyectando archivo en input de Fotos...');
      await call('DOM.setFileInputFiles', { backendNodeId, files: [FLYER] });
      await new Promise(r => setTimeout(r, 3500));

      // 4. Inspeccionar todos los campos de texto en el editor abierto
      console.log('4. Inspeccionando campos de texto en el editor...');
      const inspectRes = await call('Runtime.evaluate', {
        expression: `(() => {
          const editables = Array.from(document.querySelectorAll('div[contenteditable="true"], div[role="textbox"], input, textarea'));
          return editables.map(e => ({
            tag: e.tagName,
            role: e.getAttribute('role'),
            placeholder: e.getAttribute('placeholder') || e.getAttribute('aria-label') || e.getAttribute('title'),
            tab: e.getAttribute('data-tab'),
            visible: e.offsetWidth > 0 && e.offsetHeight > 0,
            rect: e.getBoundingClientRect()
          }));
        })()`,
        returnByValue: true
      });

      console.log('Campos editables encontrados en el editor:', JSON.stringify(inspectRes.result?.value, null, 2));

      // 5. Inyectar texto de pie de foto
      const waCaption = `⚡ *NANOAI INDUSTRIAL OS* | _Optimización Algorítmica en Planta_\n\nEstimada Gerencia de Operaciones:\n¿Cuánto le cuesta al mes calcular mermas y cotizar tirajes de forma manual?\n\n📊 *Comparativa Real en Fábricas de Quito:*\n🔴 *Método Tradicional:* -$3,600 USD/mes en nómina técnica fija (3 personas) | 48h de espera | 8% a 15% de descarte.\n🟢 *NanoAI Air-Gapped:* $0 nómina recurrente | < 45 segundos por cotización | < 2% de merma de material.\n\n💰 *Impacto Financiero Directo:* Retorno neto de *+$4,200 USD/mes* en flujo de caja.\n\n🎁 *OFERTA HORMOZI DE LANZAMIENTO (QUITO):*\n✅ *3 MESES GRATIS DE SOPORTE TÉCNICO*\n✅ *Visita Técnica Presencial de 20 minutos* en su planta por nuestro Director Técnico.\n\n📅 _¿Coordinamos la visita técnica para este jueves o viernes?_\n🌐 https://nanoai.ec`;

      console.log('5. Inyectando texto en el pie de foto...');
      const fillRes = await call('Runtime.evaluate', {
        expression: `(() => {
          // Buscar el input del pie de foto
          const all = Array.from(document.querySelectorAll('div[contenteditable="true"]'));
          // En el visor multimedia de WhatsApp, el input del pie de foto suele ser el último o el que está visible en la parte inferior
          const visibleEditables = all.filter(e => e.offsetWidth > 0 && e.offsetHeight > 0);
          const caption = visibleEditables[visibleEditables.length - 1];
          if (caption) {
            caption.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
            document.execCommand('insertText', false, ${JSON.stringify(waCaption)});
            caption.dispatchEvent(new Event('input', { bubbles: true }));
            caption.dispatchEvent(new Event('change', { bubbles: true }));
            return { ok: true, textLength: caption.innerText.length };
          }
          return { ok: false, reason: 'no visible caption element' };
        })()`,
        returnByValue: true
      });

      console.log('Resultado Inyección de Texto:', JSON.stringify(fillRes.result?.value));
      await new Promise(r => setTimeout(r, 2000));

      // 6. Tomar captura del editor con el texto visible
      console.log('6. Capturando editor con el texto visible...');
      const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
      if (snap?.data) {
        const out = path.join(ASSETS_DIR, 'live_wa_photo_with_text_editor.jpg');
        fs.writeFileSync(out, Buffer.from(snap.data, 'base64'));
        console.log('📸 VISTA DEL EDITOR CON TEXTO:', out);
      }

      // 7. Clic en Enviar
      console.log('7. Enviando Foto con Texto...');
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

      // 8. Captura final entregado
      const snapDelivered = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
      if (snapDelivered?.data) {
        const outDelivered = path.join(ASSETS_DIR, 'live_wa_photo_and_text_delivered.jpg');
        fs.writeFileSync(outDelivered, Buffer.from(snapDelivered.data, 'base64'));
        console.log('✅ CAPTURA FINAL CON TEXTO Y FOTO ENTREGADOS:', outDelivered);
      }
    }

    ws.close();
    process.exit(0);
  });
}

testPhotoWithText();
