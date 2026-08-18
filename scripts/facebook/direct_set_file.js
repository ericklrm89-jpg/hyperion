/**
 * HYPERION — Direct Deep File Injection for Meta Business Suite
 */
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const VIDEO = 'C:\\FairDraw\\fairdraw-social\\output\\fairdraw_promo_final.mp4';

let cdpId = 1;
function cdpCall(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = cdpId++;
    const h = (data) => {
      try {
        const r = JSON.parse(data);
        if (r.id === id) { ws.removeListener('message', h); r.error ? reject(new Error(JSON.stringify(r.error))) : resolve(r.result || {}); }
      } catch(e) {}
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  const fbTab = tabs.find(t => t.type==='page' && t.url.includes('facebook.com'));
  if (!fbTab) throw new Error('No FB tab');

  const ws = new WebSocket(fbTab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');

  console.log('Fetching deep DOM tree with pierce: true...');
  await cdpCall(ws, 'DOM.enable');
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });

  const inputs = await cdpCall(ws, 'DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input' });
  console.log(`Found ${inputs.nodeIds.length} input nodes total.`);

  for (const nodeId of inputs.nodeIds) {
    const desc = await cdpCall(ws, 'DOM.describeNode', { nodeId });
    const type = desc.node.attributes ? desc.node.attributes[desc.node.attributes.indexOf('type') + 1] : '';
    console.log(`Node ${nodeId}: tag=${desc.node.nodeName}, type=${type}, backendNodeId=${desc.node.backendNodeId}`);

    if (desc.node.nodeName.toLowerCase() === 'input' && (type === 'file' || !type)) {
      try {
        await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: desc.node.backendNodeId, files: [VIDEO] });
        console.log(`   ✅ Injected video file on backendNodeId ${desc.node.backendNodeId}`);
      } catch(e) {
        console.log(`   ❌ Injection failed on ${desc.node.backendNodeId}:`, e.message);
      }
    }
  }

  console.log('Waiting 10s for preview update...');
  await wait(10000);

  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_DEEP_INJECT_PREVIEW.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_DEEP_INJECT_PREVIEW.png');

  ws.close();
}

main().catch(console.error);
