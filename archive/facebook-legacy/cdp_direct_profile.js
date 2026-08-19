const WebSocket = require('ws');
const fs = require('fs');

const FB_TAB_WS = 'ws://127.0.0.1:9222/devtools/page/D2506818D1D1A339C9C10D6A6C92BBEC';
const OUT = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\';

let msgId = 1;
const pending = new Map();

function send(ws, method, params = {}) {
  const id = msgId++;
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { pending.delete(id); rej(new Error(`Timeout: ${method}`)); }, 15000);
    pending.set(id, { res, rej, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  const ws = new WebSocket(FB_TAB_WS);

  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej, timer } = pending.get(msg.id);
        clearTimeout(timer);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result || {});
      }
    } catch(e) {}
  });

  await new Promise((res, rej) => {
    ws.on('open', res);
    ws.on('error', rej);
  });

  console.log('Connected to FB tab via CDP');

  // Navigate to FairDraw profile
  console.log('Navigating to https://www.facebook.com/fairdrawapp/ ...');
  await send(ws, 'Page.enable');
  await send(ws, 'Page.navigate', { url: 'https://www.facebook.com/fairdrawapp/' });
  
  // Wait for page to settle
  console.log('Waiting 7s for page load...');
  await new Promise(r => setTimeout(r, 7000));

  // Screenshot top
  let ss = await send(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT + 'fb_FAIRDRAW_PROFILE_TOP.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_FAIRDRAW_PROFILE_TOP.png');

  // Scroll down to see posts/reels
  await send(ws, 'Runtime.evaluate', { expression: 'window.scrollBy(0, 600)' });
  await new Promise(r => setTimeout(r, 2000));

  ss = await send(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT + 'fb_FAIRDRAW_PROFILE_SCROLL.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_FAIRDRAW_PROFILE_SCROLL.png');

  ws.close();
  console.log('DONE');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
