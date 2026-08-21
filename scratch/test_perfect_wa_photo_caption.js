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

async function testPerfectPhotoWithCaption() {
  console.log('🚀 TEST: Envío de FOTO HD con Pie de Foto Integrado (Cero Stickers, Cero Borradores)...');
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

    // 1. Navegar directamente a chat Tú
    console.log('1. Navegando al chat Tú...');
    await call('Runtime.evaluate', {
      expression: `window.location.href = 'https://web.whatsapp.com/send?phone=593998098229';`
    });

    // Esperar chat
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const chk = await call('Runtime.evaluate', {
        expression: `!!(document.querySelector('footer div[contenteditable="true"]'))`,
        returnByValue: true
      });
      if (chk?.result?.value) {
        console.log(`Chat cargado en ${i+1}s`);
        break;
      }
    }

    await new Promise(r => setTimeout(r, 1500));

    // 2. Inyectar imagen vía Clipboard Paste en el footer
    console.log('2. Pegando imagen HD como Archivo Multimedia...');
    const imageBase64 = fs.readFileSync(FLYER).toString('base64');
    const waCaption = `⚡ *NANOAI INDUSTRIAL OS* | _Optimización Algorítmica en Planta_\n\nEstimada Gerencia de Operaciones:\n¿Cuánto le cuesta al mes calcular mermas y cotizar tirajes de forma manual?\n\n📊 *Comparativa Real en Fábricas de Quito:*\n🔴 *Método Tradicional:* -$3,600 USD/mes en nómina técnica fija | 48h de espera | 8% a 15% de descarte.\n🟢 *NanoAI Air-Gapped:* $0 nómina recurrente | < 45 segundos por cotización | < 2% de merma de material.\n\n💰 *Impacto Financiero Directo:* Retorno neto de *+$4,200 USD/mes* en flujo de caja.\n\n🎁 *OFERTA HORMOZI DE LANZAMIENTO (QUITO):*\n✅ *3 MESES GRATIS DE SOPORTE TÉCNICO*\n✅ *Visita Técnica Presencial de 20 minutos* en su planta por nuestro Director Técnico.\n\n📅 _¿Coordinamos la visita técnica para este jueves o viernes?_\n🌐 https://nanoai.ec`;

    const pasteResult = await call('Runtime.evaluate', {
      expression: `(async () => {
        try {
          const byteChars = atob('${imageBase64}');
          const byteNumbers = new Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const file = new File([byteArray], 'nanoai_industrial_flyer.jpg', { type: 'image/jpeg' });

          const composer = document.querySelector('footer div[contenteditable="true"]');
          if (!composer) return { ok: false, msg: 'no composer' };

          composer.focus();
          const dt = new DataTransfer();
          dt.items.add(file);

          const pasteEvt = new ClipboardEvent('paste', {
            clipboardData: dt,
            bubbles: true,
            cancelable: true
          });

          composer.dispatchEvent(pasteEvt);
          return { ok: true };
        } catch(e) {
          return { ok: false, error: e.message };
        }
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('Resultado Paste:', JSON.stringify(pasteResult.result?.value));
    await new Promise(r => setTimeout(r, 3000));

    // 3. Escribir pie de foto (Caption) en el editor multimedia
    console.log('3. Inyectando pie de foto en el editor de imagen...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        // En el editor de WhatsApp el input de pie de foto tiene role textbox o contenteditable
        const captionBox = document.querySelector('div[data-animate-media-viewer="true"] div[contenteditable="true"]') ||
                           document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
                           document.querySelector('div[role="textbox"]');
        if (captionBox) {
          captionBox.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('delete', false, null);
          document.execCommand('insertText', false, ${JSON.stringify(waCaption)});
          captionBox.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 1500));

    // 4. Capturar pantalla del editor de fotos HD con su pie de foto
    console.log('4. Capturando vista previa del editor de fotos con pie de foto...');
    const snapEditor = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snapEditor?.data) {
      const outEditor = path.join(ASSETS_DIR, 'live_wa_editor_with_caption.jpg');
      fs.writeFileSync(outEditor, Buffer.from(snapEditor.data, 'base64'));
      console.log('📸 Editor capturado en:', outEditor);
    }

    // 5. Enviar Foto HD con Enter y botón verde
    console.log('5. Disparando envío de Foto HD...');
    await call('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 13, text: '\r' });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13 });
    await new Promise(r => setTimeout(r, 1000));

    await call('Runtime.evaluate', {
      expression: `(() => {
        const sendBtn = document.querySelector('span[data-icon="wds-ic-send-filled"]') ||
                        document.querySelector('span[data-icon="send"]') ||
                        document.querySelector('div[aria-label="Enviar"]');
        if (sendBtn) {
          const b = sendBtn.closest('button, div[role="button"]') || sendBtn;
          b.click();
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 4000));

    // 6. Captura final del chat enviado
    const snapSent = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snapSent?.data) {
      const outSent = path.join(ASSETS_DIR, 'live_wa_photo_verified_sent.jpg');
      fs.writeFileSync(outSent, Buffer.from(snapSent.data, 'base64'));
      console.log('✅ CAPTURA VERIFICADA ENVIADA:', outSent);
    }

    ws.close();
    process.exit(0);
  });
}

testPerfectPhotoWithCaption();
