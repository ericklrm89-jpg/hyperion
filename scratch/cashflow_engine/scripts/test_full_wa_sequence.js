const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

const FLYER_PATH = 'C:/hyperion/scratch/cashflow_engine/public/assets/nanoai_asoprotexdor_textiles_flyer.jpg';

async function testFullWA() {
  const tabs = await new Promise(res => {
    http.get('http://127.0.0.1:9001/json', r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    });
  });

  const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!waTab) return;

  const ws = new WebSocket(waTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  
  const send = (method, params = {}) => new Promise((resolve, reject) => {
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

  await send('Page.enable');
  await send('DOM.enable');

  // 1. Click currently visible send button to clear any draft in chat
  await send('Runtime.evaluate', {
    expression: `(() => {
      const sendIcon = document.querySelector('span[data-icon="wds-ic-send-filled"]') ||
                       document.querySelector('span[data-icon="send"]') ||
                       document.querySelector('button[aria-label="Enviar"]') ||
                       document.querySelector('div[aria-label*="Enviar"]');
      if (sendIcon) {
        const btn = sendIcon.closest('button, div[role="button"]') || sendIcon;
        btn.click();
        return 'Cleared draft by clicking send';
      }
      return 'No draft send button';
    })()`,
    returnByValue: true
  });
  await new Promise(r => setTimeout(r, 2000));

  // 2. Open Attach Menu
  console.log('Opening attach menu (+)...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const plusBtn = document.querySelector('span[data-icon="plus"]') ||
                      document.querySelector('span[data-icon="attach-menu-plus"]') ||
                      document.querySelector('div[title="Adjuntar"]');
      if (plusBtn) plusBtn.closest('button, div[role="button"]').click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  // 3. Set file input
  console.log('Injecting file into image input...');
  const doc = await send('DOM.getDocument', { depth: -1, pierce: true });
  const fileInputs = await send('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[accept*="image"]' });
  if (fileInputs.nodeIds && fileInputs.nodeIds.length > 0) {
    const desc = await send('DOM.describeNode', { nodeId: fileInputs.nodeIds[0] });
    console.log('Found input backendNodeId:', desc.node?.backendNodeId);
    await send('DOM.setFileInputFiles', {
      backendNodeId: desc.node?.backendNodeId,
      files: [FLYER_PATH]
    });
    
    // Dispatch change event to ensure React picks it up
    await send('Runtime.evaluate', {
      expression: `(() => {
        const inp = document.querySelector('input[accept*="image"]');
        if (inp) {
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 3500));
  }

  // 4. Capture screenshot of Media Viewer
  let snap = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
  if (snap?.data) fs.writeFileSync('C:/hyperion/scratch/cashflow_engine/public/assets/live_wa_step1_viewer.jpg', Buffer.from(snap.data, 'base64'));

  // 5. In Media Viewer, click send
  console.log('Clicking send in Media Viewer...');
  const sendMediaRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const sendBtn = document.querySelector('div[data-animate-media-viewer="true"] span[data-icon="wds-ic-send-filled"]') ||
                      document.querySelector('div[data-animate-media-viewer="true"] span[data-icon="send"]') ||
                      document.querySelector('span[data-icon="wds-ic-send-filled"]') ||
                      document.querySelector('div[aria-label*="Enviar"]');
      if (sendBtn) {
        const b = sendBtn.closest('button, div[role="button"]') || sendBtn;
        b.click();
        return 'Clicked Media Send Button';
      }
      return 'No Media Send Button';
    })()`,
    returnByValue: true
  });
  console.log('Media send result:', sendMediaRes);
  await new Promise(r => setTimeout(r, 4500));

  // 6. Capture screenshot after photo send
  snap = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
  if (snap?.data) fs.writeFileSync('C:/hyperion/scratch/cashflow_engine/public/assets/live_wa_step2_photo_sent.jpg', Buffer.from(snap.data, 'base64'));

  // 7. Now write executive proposal in chat
  console.log('Typing executive text...');
  const text = "Hola estimado equipo de PITEX S.A. 👋 Le saluda Erick, Director Técnico de NanoAI en Quito.\n\nLe comparto arriba la ficha técnica de cómo funciona nuestro software industrial On-Premise para optimizar corte textil y rendimiento de tela en su propia red local.\n\n¿Tendrían 20 minutos esta semana para una visita técnica presencial en sus oficinas?";

  await send('Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('footer div[contenteditable="true"]');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(text)});
        ed.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  // 8. Click chat send button
  console.log('Clicking chat send button...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const sendBtn = document.querySelector('footer span[data-icon="wds-ic-send-filled"]') ||
                      document.querySelector('footer span[data-icon="send"]') ||
                      document.querySelector('footer button[aria-label="Enviar"]') ||
                      document.querySelector('footer div[role="button"]');
      if (sendBtn) {
        const b = sendBtn.closest('button, div[role="button"]') || sendBtn;
        b.click();
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 4000));

  // 9. Final screenshot
  snap = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  if (snap?.data) fs.writeFileSync('C:/hyperion/scratch/cashflow_engine/public/assets/live_wa_step3_final.jpg', Buffer.from(snap.data, 'base64'));
  console.log('Saved live_wa_step3_final.jpg');

  ws.close();
}

testFullWA().catch(console.error);
