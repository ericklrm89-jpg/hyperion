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

  console.log('Finding Next button...');
  const res = await call('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button, span')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'next' || txt === 'siguiente') && r.width > 80;
      });
      if (btns.length > 0) {
        const b = btns[btns.length - 1];
        b.click();
        return 'Clicked ' + b.textContent + ' ' + JSON.stringify(b.getBoundingClientRect());
      }
      return 'Not found';
    })()`,
    returnByValue: true
  });
  console.log('Result:', res.result?.value);

  await new Promise(r => setTimeout(r, 4000));
  const ss = await call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_EXACT_NEXT_SCREEN.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_EXACT_NEXT_SCREEN.png');
  ws.close();
}

main().catch(console.error);
