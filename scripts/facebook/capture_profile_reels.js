/**
 * HYPERION — Capture Live Facebook Profile Reels Today
 */
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

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
  await cdpCall(ws, 'Page.bringToFront');

  // STEP 1: Navigate to fairdrawapp/reels
  console.log('1. Navigating to https://www.facebook.com/fairdrawapp/reels ...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.location.href='https://www.facebook.com/fairdrawapp/reels';" });
  await wait(8000);

  let ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_PROFILE_REELS_TODAY.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_PROFILE_REELS_TODAY.png');

  // STEP 2: Navigate to main profile feed & scroll
  console.log('2. Navigating to https://www.facebook.com/fairdrawapp/ ...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.location.href='https://www.facebook.com/fairdrawapp/';" });
  await wait(8000);

  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.scrollBy(0, 700);" });
  await wait(3000);

  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_PROFILE_FEED_TODAY.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_PROFILE_FEED_TODAY.png');

  ws.close();
}

main().catch(console.error);
