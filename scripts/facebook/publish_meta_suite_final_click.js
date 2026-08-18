/**
 * HYPERION — Complete Meta Business Suite Video Add & Publish
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

async function mouseClick(ws, x, y) {
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  const fbTab = tabs.find(t => t.type==='page' && t.url.includes('facebook.com'));
  if (!fbTab) throw new Error('No FB tab');

  const ws = new WebSocket(fbTab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // STEP 1: Click Add photo/video
  console.log('1. Clicking Add photo/video button at x=135, y=510...');
  await mouseClick(ws, 135, 510);
  await wait(2000);

  // STEP 2: Click "Add video" in menu
  console.log('2. Clicking "Add video" in dropdown menu...');
  const addVideoClicked = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const items = Array.from(document.querySelectorAll('div[role="menuitem"], div[role="button"], span, div')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        return txt === 'add video' || txt === 'añadir vídeo' || txt === 'añadir video' || txt === 'agregar video';
      });
      if (items.length > 0) {
        const b = items[0];
        const r = b.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });
  if (addVideoClicked.result?.value) {
    const p = JSON.parse(addVideoClicked.result.value);
    console.log(`   Add Video clicked at x=${p.x}, y=${p.y}`);
    await mouseClick(ws, p.x, p.y);
  }
  await wait(2000);

  // STEP 3: Inject file
  console.log('3. Injecting video file into input[type="file"]...');
  await cdpCall(ws, 'DOM.enable');
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const fileInputs = await cdpCall(ws, 'DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  if (fileInputs.nodeIds && fileInputs.nodeIds.length > 0) {
    for (const nodeId of fileInputs.nodeIds) {
      const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId });
      await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: nodeInfo.node.backendNodeId, files: [VIDEO] });
    }
  }
  console.log('   Waiting 15s for video upload...');
  await wait(15000);

  let ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_meta_VIDEO_LOADED_PREVIEW.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_meta_VIDEO_LOADED_PREVIEW.png');

  // STEP 4: Click Publish button
  console.log('4. Clicking Publish button at x=480, y=925...');
  await mouseClick(ws, 480, 925);
  console.log('   Waiting 15s for publication...');
  await wait(15000);

  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_meta_SUCCESSFULLY_PUBLISHED.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_meta_SUCCESSFULLY_PUBLISHED.png');

  ws.close();
}

main().catch(console.error);
