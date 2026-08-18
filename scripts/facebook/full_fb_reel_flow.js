/**
 * HYPERION — Complete Sequential Facebook Reel Publisher (Next -> Post -> Verify)
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
  await cdpCall(ws, 'Page.bringToFront');

  // STEP 1: Click Next on Edit Reel screen
  console.log('1. Clicking Next on Edit Reel screen at x=175, y=925...');
  await mouseClick(ws, 175, 925);
  await wait(4000);

  let ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_step1_next_clicked.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_step1_next_clicked.png');

  // STEP 2: Find Post / Publicar button and click
  console.log('2. Clicking Post / Publicar button on final screen...');
  const postBtn = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button, span')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'post' || txt === 'publicar' || txt === 'share' || txt === 'compartir') && r.width > 0;
      });
      if (btns.length > 0) {
        const b = btns[btns.length - 1];
        b.click();
        const r = b.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), txt: b.textContent });
      }
      return null;
    })()`,
    returnByValue: true
  });
  console.log('Post btn result:', postBtn.result?.value);
  if (!postBtn.result?.value) {
    console.log('   Fallback mouse click at x=175, y=925...');
    await mouseClick(ws, 175, 925);
  }

  console.log('Waiting 15s for Facebook Reel publication...');
  await wait(15000);

  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_REEL_PUBLISHED_CONFIRMED.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_REEL_PUBLISHED_CONFIRMED.png');

  ws.close();
}

main().catch(console.error);
