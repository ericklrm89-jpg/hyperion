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

async function testRealPhotoSend() {
  console.log('🚀 Probando inyección de FOTO REAL HD (Cero Stickers)...');
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

    // 1. Cerrar cualquier modal que esté abierto (como el de reenviar)
    await call('Runtime.evaluate', {
      expression: `(() => {
        const closeBtn = document.querySelector('div[aria-label="Cerrar"]') || 
                         document.querySelector('span[data-icon="x"]') ||
                         document.querySelector('button[aria-label="Cerrar"]');
        if (closeBtn) closeBtn.closest('button, div[role="button"]').click();
      })()`
    });
    await new Promise(r => setTimeout(r, 600));

    // 2. Abrir chat "Tú" de forma garantizada
    console.log('1. Abriendo chat Tú...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const chatRows = Array.from(document.querySelectorAll('div[role="listitem"]'));
        const tu = chatRows.find(c => c.innerText && (c.innerText.includes('Tú') || c.innerText.includes('8229')));
        if (tu) tu.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    // 3. Inyectar imagen vía DataTransfer Drop Event en el panel de conversación principal
    console.log('2. Inyectando imagen HD mediante Drag & Drop / File Blob nativo...');
    const imageBase64 = fs.readFileSync(FLYER).toString('base64');

    const injectResult = await call('Runtime.evaluate', {
      expression: `(async () => {
        try {
          // Convert base64 to Blob
          const byteChars = atob('${imageBase64}');
          const byteNumbers = new Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const file = new File([byteArray], 'nanoai_b2b_square_hd_flyer.jpg', { type: 'image/jpeg' });

          // Find the main chat drop target (conversation panel)
          const dropTarget = document.querySelector('#main') || 
                             document.querySelector('div[data-tab="6"]') || 
                             document.querySelector('footer');

          if (!dropTarget) return { success: false, reason: 'No dropTarget found' };

          // Create DataTransfer
          const dt = new DataTransfer();
          dt.items.add(file);

          // Dispatch Drag and Drop events
          const dragEnter = new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true });
          const dragOver = new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true });
          const drop = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true });

          dropTarget.dispatchEvent(dragEnter);
          dropTarget.dispatchEvent(dragOver);
          dropTarget.dispatchEvent(drop);

          // Also try paste event on active composer
          const composer = document.querySelector('footer div[contenteditable="true"]');
          if (composer) {
            composer.focus();
            const pasteEvent = new ClipboardEvent('paste', {
              clipboardData: dt,
              bubbles: true,
              cancelable: true
            });
            composer.dispatchEvent(pasteEvent);
          }

          return { success: true };
        } catch(e) {
          return { success: false, error: e.message };
        }
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('Resultado Inyección:', JSON.stringify(injectResult.result.value));
    await new Promise(r => setTimeout(r, 4000));

    // 4. Capturar pantalla para verificar si abrió el visor de fotos HD
    console.log('3. Capturando pantalla tras inyección...');
    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap?.data) {
      const out = path.join(ASSETS_DIR, 'live_wa_real_photo_editor.jpg');
      fs.writeFileSync(out, Buffer.from(snap.data, 'base64'));
      console.log('📸 Captura guardada en:', out);
    }

    // 5. Si el botón de enviar foto está visible, hacer clic
    const sendRes = await call('Runtime.evaluate', {
      expression: `(() => {
        const sendMediaBtn = document.querySelector('span[data-icon="send"]') || 
                             document.querySelector('div[aria-label="Enviar"]') ||
                             document.querySelector('button[aria-label="Enviar"]');
        if (sendMediaBtn) {
          const btn = sendMediaBtn.closest('button, div[role="button"]') || sendMediaBtn;
          btn.click();
          return 'CLICKED_SEND_MEDIA';
        }
        return 'NO_SEND_MEDIA_BTN';
      })()`,
      returnByValue: true
    });

    console.log('Estado de Envío:', JSON.stringify(sendRes.result.value));
    await new Promise(r => setTimeout(r, 3000));

    // 6. Captura final del chat con la foto enviada
    const finalSnap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (finalSnap?.data) {
      const finalOut = path.join(ASSETS_DIR, 'live_wa_real_photo_sent_verified.jpg');
      fs.writeFileSync(finalOut, Buffer.from(finalSnap.data, 'base64'));
      console.log('✅ CAPTURA FINAL ENVIADA GUARDADA EN:', finalOut);
    }

    ws.close();
    process.exit(0);
  });
}

testRealPhotoSend();
