/**
 * HYPERION — Click Next on Edit Reel & Click Final Post Reel Button
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
  await cdpCall(ws, 'Page.bringToFront');

  // STEP 1: Click Next on Edit Reel screen (x=175, y=925)
  console.log('1. Clicking Next on Edit Reel screen at x=175, y=925...');
  await mouseClick(ws, 175, 925);
  await wait(4000);

  let ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_FINAL_REEL_CAPTION_SCREEN.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_FINAL_REEL_CAPTION_SCREEN.png');

  // STEP 2: Click Post / Publicar button on final screen
  console.log('2. Clicking Post / Publicar button on final Reel screen...');
  const postClicked = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button, span')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'post' || txt === 'publicar' || txt === 'share' || txt === 'post reel' || txt === 'publicar reel') && r.width > 0;
      });
      if (btns.length > 0) {
        const b = btns[btns.length - 1];
        b.scrollIntoView({ block: 'center' });
        b.click();
        return 'Clicked: ' + b.textContent;
      }
      return null;
    })()`,
    returnByValue: true
  });
  console.log('Post result:', postClicked.result?.value);
  if (!postClicked.result?.value) {
    await mouseClick(ws, 175, 925);
  }

  console.log('Waiting 15s for Facebook Reel post submission...');
  await wait(15000);

  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_REEL_FULLY_PUBLISHED_LIVE.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_REEL_FULLY_PUBLISHED_LIVE.png');

  ws.close();
}

main().catch(console.error);
