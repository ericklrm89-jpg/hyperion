/**
 * HYPERION — Escape Hashtag Autocomplete & Click Real Add Photo/Video
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
  await cdpCall(ws, 'DOM.enable');

  // Enable file chooser interceptor
  await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: true });

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
        console.log('   ✅ Video injected into File Chooser!');
      }
    } catch(e) {}
  });

  // STEP 1: Press Escape twice to close hashtag dropdown
  console.log('1. Pressing Escape key twice to dismiss hashtag popup...');
  await cdpCall(ws, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape' });
  await cdpCall(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape' });
  await wait(500);
  await cdpCall(ws, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape' });
  await cdpCall(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape' });
  await wait(1500);

  let ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_HASHTAG_DISMISSED.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_HASHTAG_DISMISSED.png');

  // STEP 2: Click Add photo/video button
  console.log('2. Clicking Add photo/video button at x=135, y=510...');
  await mouseClick(ws, 135, 510);
  await wait(3000);

  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_MEDIA_MENU_AFTER_ESCAPE.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_MEDIA_MENU_AFTER_ESCAPE.png');

  // STEP 3: Click Add Video in media menu
  console.log('3. Searching and clicking "Add video" in media menu...');
  const addVidClicked = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const items = Array.from(document.querySelectorAll('div[role="menuitem"], div[role="button"], span, div')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'add video' || txt === 'añadir vídeo' || txt === 'añadir video' || txt.includes('video')) && r.width > 0;
      });
      if (items.length > 0) {
        const b = items[0];
        const r = b.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), txt: b.textContent });
      }
      return null;
    })()`,
    returnByValue: true
  });
  console.log('Add video option:', addVidClicked.result?.value);
  if (addVidClicked.result?.value) {
    const p = JSON.parse(addVidClicked.result.value);
    await mouseClick(ws, p.x, p.y);
  } else {
    // Click default location of Add video in media menu
    await mouseClick(ws, 135, 555);
  }

  console.log('Waiting 15s for video upload...');
  await wait(15000);

  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_REAL_VIDEO_UPLOADED_PREVIEW.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_REAL_VIDEO_UPLOADED_PREVIEW.png');

  // STEP 4: Click Publish button
  console.log('4. Clicking Publish button at x=480, y=925...');
  await mouseClick(ws, 480, 925);
  await wait(15000);

  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_FINAL_POSTED_COMPLETE.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_FINAL_POSTED_COMPLETE.png');

  ws.close();
}

main().catch(console.error);
