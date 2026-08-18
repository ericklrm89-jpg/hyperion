const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  const fbTab = tabs.find(t => t.type==='page' && t.url.includes('facebook.com'));
  if (!fbTab) return;

  const ws = new WebSocket(fbTab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  let id = 1;
  const call = (m, p = {}) => new Promise(res => {
    const h = data => {
      const r = JSON.parse(data);
      if (r.id === id) { ws.removeListener('message', h); res(r.result || {}); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id: id++, method: m, params: p }));
  });

  await call('Page.enable');
  await call('Page.bringToFront');

  console.log('Sending CDP physical mouse click at x=175, y=925...');
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 175, y: 925 });
  await new Promise(r => setTimeout(r, 80));
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: 175, y: 925, button: 'left', clickCount: 1 });
  await new Promise(r => setTimeout(r, 80));
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 175, y: 925, button: 'left', clickCount: 1 });

  console.log('Waiting 5s...');
  await new Promise(r => setTimeout(r, 5000));

  const ss = await call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_CDP_PHYSICAL_CLICK_NEXT.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_CDP_PHYSICAL_CLICK_NEXT.png');

  ws.close();
}

main().catch(console.error);
