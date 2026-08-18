/**
 * HYPERION — Find Exact Next Button Coordinates & Click
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

  console.log('Finding all visible buttons on Facebook...');
  const buttonsInfo = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const els = Array.from(document.querySelectorAll('*')).filter(e => {
        const txt = (e.textContent || '').trim();
        const r = e.getBoundingClientRect();
        return r.width > 30 && r.height > 15 && (txt.toLowerCase() === 'next' || txt.toLowerCase() === 'siguiente');
      }).map(e => {
        const r = e.getBoundingClientRect();
        return { tag: e.tagName, txt: e.textContent.trim(), x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), w: r.width, h: r.height };
      });
      return JSON.stringify(els);
    })()`,
    returnByValue: true
  });
  console.log('Next buttons found:', buttonsInfo.result?.value);

  const btns = JSON.parse(buttonsInfo.result?.value || '[]');
  if (btns.length > 0) {
    const target = btns[btns.length - 1];
    console.log(`Clicking exact target at x=${target.x}, y=${target.y}...`);
    await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: target.x, y: target.y });
    await wait(80);
    await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: target.x, y: target.y, button: 'left', clickCount: 1 });
    await wait(80);
    await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: target.x, y: target.y, button: 'left', clickCount: 1 });

    // Also call .click() directly on element
    await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const els = Array.from(document.querySelectorAll('*')).filter(e => {
          const txt = (e.textContent || '').trim().toLowerCase();
          return txt === 'next' || txt === 'siguiente';
        });
        if (els.length > 0) els[els.length - 1].click();
      })()`
    });
  }

  await wait(4000);
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_NEXT_EXACT_CLICKED_SCREEN.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_NEXT_EXACT_CLICKED_SCREEN.png');

  ws.close();
}

main().catch(console.error);
