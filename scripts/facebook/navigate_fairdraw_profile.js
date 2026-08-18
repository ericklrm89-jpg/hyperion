const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  console.log('All tabs:', tabs.map(t => ({ id: t.id, url: t.url, type: t.type })));

  const fbTab = tabs.find(t => t.type==='page' && t.url.includes('facebook.com'));
  if (!fbTab) return console.log('No FB tab found');

  const ws = new WebSocket(fbTab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  let id = 1;
  const call = (m, p = {}) => new Promise(res => {
    const h = data => {
      try {
        const r = JSON.parse(data);
        if (r.id === id) { ws.removeListener('message', h); res(r.result || {}); }
      } catch(e) {}
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id: id++, method: m, params: p }));
  });

  await call('Page.enable');
  await call('Page.bringToFront');

  // Close modal first via Escape
  await call('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape' });
  await new Promise(r => setTimeout(r, 500));
  await call('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape' });
  await new Promise(r => setTimeout(r, 1000));

  // Navigate directly to FairDraw page using JS navigation (no onbeforeunload)
  console.log('Navigating to fairdrawapp profile...');
  await call('Page.navigate', { url: 'https://www.facebook.com/fairdrawapp/' });
  await new Promise(r => setTimeout(r, 8000));

  const ss = await call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_PROFILE_FINAL_LIVE.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_PROFILE_FINAL_LIVE.png');
  ws.close();
}

main().catch(console.error);
