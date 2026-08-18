/**
 * HYPERION — Exact Meta Business Suite 3-Step Video Upload & Publish
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
  await wait(100);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(100);
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
  await cdpCall(ws, 'DOM.enable');

  // Intercept file chooser
  await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: true });

  let fileInjected = false;
  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.method === 'Page.fileChooserOpened') {
        console.log('🎉 EVENT DETECTED: Page.fileChooserOpened!', msg.params);
        if (msg.params.backendNodeId) {
          await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: msg.params.backendNodeId, files: [VIDEO] });
        } else {
          await cdpCall(ws, 'DOM.setFileInputFiles', { files: [VIDEO] });
        }
        fileInjected = true;
        console.log('   ✅ Video file injected into File Chooser!');
      }
    } catch(e) {}
  });

  // STEP 1: Click Add photo/video
  console.log('1. Clicking Add photo/video button at x=135, y=510...');
  await mouseClick(ws, 135, 510);
  await wait(1200);

  // STEP 2: Hover/Click Add video at x=135, y=595
  console.log('2. Clicking Add video option at x=135, y=595...');
  await mouseClick(ws, 135, 595);
  await wait(1200);

  // STEP 3: Click Upload from desktop at x=280, y=595
  console.log('3. Clicking Upload from desktop option at x=280, y=595...');
  await mouseClick(ws, 280, 595);
  await wait(3000);

  console.log('Waiting 12s for video file processing...');
  await wait(12000);

  let ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_META_TRIPLE_INJECTED.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_META_TRIPLE_INJECTED.png');

  // STEP 4: Click Publish button at x=480, y=925
  console.log('4. Clicking Publish button at x=480, y=925...');
  await mouseClick(ws, 480, 925);
  await wait(15000);

  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_META_FINAL_POSTED_SCREEN.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_META_FINAL_POSTED_SCREEN.png');

  ws.close();
}

main().catch(console.error);
