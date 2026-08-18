/**
 * HYPERION — TikTok Confirm "Publicar ahora"
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
  let tab = tabs.find(t => t.type==='page' && t.url.includes('tiktok.com'));
  if (!tab) throw new Error('No TikTok tab');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  console.log('Clicking "Publicar ahora" button on TikTok modal...');
  const res = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const pubNow = btns.find(b => {
        const txt = (b.textContent || '').trim().toLowerCase();
        return txt.includes('publicar ahora') || txt.includes('post now');
      });
      if (pubNow) {
        pubNow.click();
        return 'clicked_publicar_ahora';
      }
      return 'not_found';
    })()`,
    returnByValue: true
  });
  console.log('Result:', res.result?.value);
  await wait(8000);

  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\tt_CONFIRMED_POSTED.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved tt_CONFIRMED_POSTED.png');
  ws.close();
}

main().catch(console.error);
