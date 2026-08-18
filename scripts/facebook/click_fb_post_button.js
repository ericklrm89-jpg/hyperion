/**
 * HYPERION — Scroll & Click Facebook Reel Post Button
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

  console.log('Finding and scrolling Post button on Facebook...');
  const btnRes = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button, span')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'post' || txt === 'publicar') && r.width > 0;
      });
      if (btns.length > 0) {
        const b = btns[btns.length - 1];
        b.scrollIntoView({ block: 'center', inline: 'center' });
        const r = b.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), txt: b.textContent });
      }
      return null;
    })()`,
    returnByValue: true
  });
  console.log('Post btn location:', btnRes.result?.value);
  
  if (btnRes.result?.value) {
    const p = JSON.parse(btnRes.result.value);
    console.log(`Clicking Post button at x=${p.x}, y=${p.y}...`);
    await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
    await wait(80);
    await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
    await wait(80);
    await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  }

  console.log('Waiting 12s for Facebook processing...');
  await wait(12000);

  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_POSTED_SCROLLED_VERIFIED.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_POSTED_SCROLLED_VERIFIED.png');
  ws.close();
}

main().catch(console.error);
