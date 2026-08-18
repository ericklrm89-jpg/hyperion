const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const VIDEO = 'C:\\Users\\erick\\Downloads\\Por_favor_anime_estas_ilust (1).mp4';

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  const tab = tabs.find(t => t.type==='page' && t.url.includes('instagram.com'));
  if (!tab) throw new Error('No Instagram tab');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));

  let cdpId = 1;
  const cdpCall = (method, params = {}) => new Promise((resolve, reject) => {
    const id = cdpId++;
    const h = (data) => {
      const r = JSON.parse(data);
      if (r.id === id) { ws.off('message', h); r.error ? reject(new Error(JSON.stringify(r.error))) : resolve(r.result || {}); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await cdpCall('DOM.enable');
  const doc = await cdpCall('DOM.getDocument');
  const fileInputs = await cdpCall('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });

  if (fileInputs.nodeIds && fileInputs.nodeIds.length > 0) {
    for (const nodeId of fileInputs.nodeIds) {
      const nodeInfo = await cdpCall('DOM.describeNode', { nodeId });
      await cdpCall('DOM.setFileInputFiles', { backendNodeId: nodeInfo.node.backendNodeId, files: [VIDEO] });
    }
  }

  await cdpCall('Runtime.evaluate', {
    expression: `(() => {
      const inputs = document.querySelectorAll('input[type="file"]');
      inputs.forEach(i => {
        i.dispatchEvent(new Event('change', { bubbles: true }));
        i.dispatchEvent(new Event('input', { bubbles: true }));
      });
    })()`
  });

  console.log('Waiting 10s for video processing...');
  await new Promise(r => setTimeout(r, 10000));

  const ss = await cdpCall('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_dispatch_test.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 Screenshot saved: ig_dispatch_test.png');

  ws.close();
}

main().catch(console.error);
