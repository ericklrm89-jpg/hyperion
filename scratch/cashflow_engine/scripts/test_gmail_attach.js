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

  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com'));
  if (!gmTab) return;

  const ws = new WebSocket(gmTab.webSocketDebuggerUrl);
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

  const doc = await send('DOM.getDocument', { depth: -1, pierce: true });
  const fileInputs = await send('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  if (fileInputs.nodeIds.length > 0) {
    const desc = await send('DOM.describeNode', { nodeId: fileInputs.nodeIds[0] });
    console.log('Setting file on backendNodeId:', desc.node?.backendNodeId);
    const res = await send('DOM.setFileInputFiles', {
      backendNodeId: desc.node?.backendNodeId,
      files: [FLYER_PATH]
    });
    console.log('setFileInputFiles result:', res);

    await new Promise(r => setTimeout(r, 4000));

    // Capture screenshot to see if it attached
    const snap = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
    if (snap?.data) {
      fs.writeFileSync('C:/hyperion/scratch/cashflow_engine/public/assets/live_gm_attach_test.jpg', Buffer.from(snap.data, 'base64'));
      console.log('Saved live_gm_attach_test.jpg');
    }
  }

  ws.close();
}
main();
