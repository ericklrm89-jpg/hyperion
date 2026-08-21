const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

const FLYER_PATH = 'C:/hyperion/scratch/cashflow_engine/public/assets/nanoai_b2b_square_hd_flyer.jpg';

async function main() {
  const tabs = await new Promise(res => {
    http.get('http://127.0.0.1:9001/json', r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    });
  });

  const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!waTab) { console.log('No WA tab'); return; }

  const ws = new WebSocket(waTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const send = (m, p={}) => new Promise(res => {
    const id = Math.floor(Math.random()*99999);
    const h = msg => {
      const d = JSON.parse(msg);
      if (d.id === id) { ws.off('message', h); res(d.result); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method: m, params: p }));
  });

  await send('DOM.enable');

  // Check if plus menu is needed or if input is already in DOM
  const doc = await send('DOM.getDocument', { depth: -1, pierce: true });
  let fileInputs = await send('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[accept*="image"]' });
  console.log('Image inputs in DOM before click:', fileInputs.nodeIds.length);

  if (fileInputs.nodeIds.length === 0) {
    // Click plus button
    await send('Runtime.evaluate', {
      expression: `(() => {
        const plus = document.querySelector('span[data-icon="plus"]') || document.querySelector('span[data-icon="attach-menu-plus"]');
        if (plus) plus.closest('button, div[role="button"]').click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1500));
    const doc2 = await send('DOM.getDocument', { depth: -1, pierce: true });
    fileInputs = await send('DOM.querySelectorAll', { nodeId: doc2.root.nodeId, selector: 'input[accept*="image"]' });
    console.log('Image inputs in DOM after click:', fileInputs.nodeIds.length);
  }

  if (fileInputs.nodeIds.length > 0) {
    const desc = await send('DOM.describeNode', { nodeId: fileInputs.nodeIds[0] });
    console.log('Setting file on WA input backendNodeId:', desc.node?.backendNodeId);
    await send('DOM.setFileInputFiles', {
      backendNodeId: desc.node?.backendNodeId,
      files: [FLYER_PATH]
    });
    await new Promise(r => setTimeout(r, 3500));

    // Capture screenshot to see if Media Viewer opened
    const snap = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
    if (snap?.data) {
      fs.writeFileSync('C:/hyperion/scratch/cashflow_engine/public/assets/live_wa_attach_test.jpg', Buffer.from(snap.data, 'base64'));
      console.log('Saved live_wa_attach_test.jpg');
    }
  }

  ws.close();
}
main();
