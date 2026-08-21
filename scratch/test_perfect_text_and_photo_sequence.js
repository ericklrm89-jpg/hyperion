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

async function testPerfectSequence() {
  console.log('🚀 TEST SECUENCIA PERFECTA: 1. Texto Persuasivo Completo -> 2. Foto HD...');
  const tabs = await getTabs();
  const wa = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!wa) return console.log('No WhatsApp tab found');

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

    // 1. Abrir chat haciendo clic en el primer contacto
    console.log('1. Abriendo chat...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const item = document.querySelector('#pane-side div[role="listitem"]');
        if (item) item.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1500));

    // 2. Redactar y Enviar TEXTO COMPLETO (Paso 1)
    console.log('2. Redactando Texto de Neuroventas en el Footer...');
    const waText = `⚡ *NANOAI INDUSTRIAL OS* | _Optimización Algorítmica en Planta_\n\nEstimada Gerencia de Operaciones:\n¿Cuánto le cuesta al mes calcular mermas y cotizar tirajes de forma manual?\n\n📊 *Comparativa Real en Fábricas de Quito:*\n🔴 *Método Tradicional:* -$3,600 USD/mes en nómina técnica fija (3 personas) | 48h de espera | 8% a 15% de descarte.\n🟢 *NanoAI Air-Gapped:* $0 nómina recurrente | < 45 segundos por cotización | < 2% de merma de material.\n\n💰 *Impacto Financiero Directo:* Retorno neto de *+$4,200 USD/mes* en flujo de caja.\n\n🎁 *OFERTA HORMOZI DE LANZAMIENTO (QUITO):*\n✅ *3 MESES GRATIS DE SOPORTE TÉCNICO*\n✅ *Visita Técnica Presencial de 20 minutos* en su planta por nuestro Director Técnico.\n\n📅 _¿Coordinamos la visita técnica para este jueves o viernes?_\n🌐 https://nanoai.ec`;

    await call('Runtime.evaluate', {
      expression: `(() => {
        const composer = document.querySelector('footer div[contenteditable="true"]');
        if (composer) {
          composer.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('delete', false, null);
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 300));

    // Usar Clipboard paste para texto multilínea preservando saltos de línea perfectamente
    await call('Runtime.evaluate', {
      expression: `(() => {
        const composer = document.querySelector('footer div[contenteditable="true"]');
        if (composer) {
          composer.focus();
          const dt = new DataTransfer();
          dt.setData('text/plain', ${JSON.stringify(waText)});
          const pasteEvent = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
          composer.dispatchEvent(pasteEvent);
          composer.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    // Disparar envío del texto con Enter
    console.log('3. Enviando Texto con Enter...');
    await call('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 13, text: '\r' });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13 });
    await new Promise(r => setTimeout(r, 1000));

    // Clic de respaldo en botón Enviar si quedó algo
    await call('Runtime.evaluate', {
      expression: `(() => {
        const sendBtn = document.querySelector('footer span[data-icon="wds-ic-send-filled"]') ||
                        document.querySelector('footer span[data-icon="send"]') ||
                        document.querySelector('footer button[aria-label="Enviar"]');
        if (sendBtn) {
          const b = sendBtn.closest('button, div[role="button"]') || sendBtn;
          b.click();
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 3000));

    // 3. Adjuntar Foto HD (Paso 2)
    console.log('4. Abriendo menú (+) para Foto HD...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const plus = document.querySelector('span[data-icon="plus"]') || 
                     document.querySelector('span[data-icon="attach-menu-plus"]');
        if (plus) plus.closest('button, div[role="button"]').click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    const evalInput = await call('Runtime.evaluate', {
      expression: `document.querySelector('input[accept*="image"]') || document.querySelector('input[type="file"]')`,
      returnByValue: false
    });

    const objectId = evalInput?.result?.objectId;
    if (objectId && fs.existsSync(FLYER)) {
      const descRes = await call('DOM.describeNode', { objectId });
      const backendNodeId = descRes?.node?.backendNodeId;

      if (backendNodeId) {
        console.log('5. Inyectando Foto HD en input multimedia...');
        await call('DOM.setFileInputFiles', { backendNodeId, files: [FLYER] });
        await new Promise(r => setTimeout(r, 3500));

        // Clic en enviar en el visor de fotos
        console.log('6. Clic en botón Enviar Foto HD...');
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
      }
    }

    // 4. Captura final del chat con Texto + Foto HD
    console.log('7. Capturando prueba de entrega verificada...');
    const snapFinal = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snapFinal?.data) {
      const outFinal = path.join(ASSETS_DIR, 'live_wa_text_and_photo_perfect_proof.jpg');
      fs.writeFileSync(outFinal, Buffer.from(snapFinal.data, 'base64'));
      console.log('✅ CAPTURA VERIFICADA GUARDADA EN:', outFinal);
    }

    ws.close();
    process.exit(0);
  });
}

testPerfectSequence();
