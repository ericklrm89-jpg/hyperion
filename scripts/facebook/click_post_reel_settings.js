/**
 * HYPERION — Dismiss hashtag popup and click Post on Reel settings
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

async function pressEscape(ws) {
  await cdpCall(ws, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape' });
  await wait(200);
  await cdpCall(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape' });
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

  // Dismiss hashtag popup
  console.log('1. Dismissing hashtag popup with Escape...');
  await pressEscape(ws);
  await wait(500);
  await pressEscape(ws);
  await wait(1000);

  // Find and click Post button
  console.log('2. Finding Post button on Reel settings...');
  const postInfo = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'post' || txt === 'publicar') && r.width > 0 && r.y > 0;
      });
      if (btns.length > 0) {
        const b = btns[btns.length - 1];
        const r = b.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), txt: b.textContent });
      }
      return null;
    })()`,
    returnByValue: true
  });
  console.log('Post btn:', postInfo.result?.value);

  if (postInfo.result?.value) {
    const p = JSON.parse(postInfo.result.value);
    console.log(`Clicking Post at x=${p.x}, y=${p.y}...`);
    await mouseClick(ws, p.x, p.y);
  } else {
    // Fallback - click at approximate Post button location from screenshot
    console.log('Fallback click at x=353, y=925...');
    await mouseClick(ws, 353, 925);
  }

  console.log('Waiting 15s for Facebook Reel to publish...');
  await wait(15000);

  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_POST_BTN_FINAL.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_POST_BTN_FINAL.png');

  ws.close();
}

main().catch(console.error);
