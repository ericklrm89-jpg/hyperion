const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

const FLYER_PATH = 'C:\\hyperion\\scratch\\cashflow_engine\\public\\assets\\nanoai_b2b_square_hd_flyer.jpg';

async function main() {
  console.log('Flyer path exists?', fs.existsSync(FLYER_PATH), 'size:', fs.statSync(FLYER_PATH).size);

  const tabs = await new Promise(res => {
    http.get('http://127.0.0.1:9001/json', r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    });
  });

  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com'));
  if (!gmTab) { console.log('No Gmail tab'); return; }

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
  console.log('File inputs found:', fileInputs.nodeIds.length);

  for (let i = 0; i < fileInputs.nodeIds.length; i++) {
    const nid = fileInputs.nodeIds[i];
    const desc = await send('DOM.describeNode', { nodeId: nid });
    console.log(`Input #${i}: backendNodeId=${desc.node?.backendNodeId}, attributes=`, desc.node?.attributes);
  }

  ws.close();
}
main();
