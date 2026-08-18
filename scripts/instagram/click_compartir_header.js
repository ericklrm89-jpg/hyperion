const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  const tab = tabs.find(t => t.type==='page' && t.url.includes('instagram.com'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));

  let cdpId = 1;
  const cdpCall = (method, params = {}) => new Promise((resolve, reject) => {
    const id = cdpId++;
    const h = (data) => {
      const r = JSON.parse(data);
      if (r.id === id) { ws.off('message', h); r.error ? reject(new Error(JSON.stringify(r.error))) : resolve(r.result || {}); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });

  const mouseClick = async (x, y) => {
    await cdpCall('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await new Promise(r => setTimeout(r, 80));
    await cdpCall('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await new Promise(r => setTimeout(r, 80));
    await cdpCall('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };

  // Click Cancelar on discard dialog
  console.log('Clicking Cancelar on discard popup...');
  await cdpCall('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').trim().toLowerCase() === 'cancelar');
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  // Find exact position of "Compartir" in header
  const compPos = await cdpCall('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button, span')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'compartir' || txt === 'share') && r.width > 0 && r.top < 200;
      });
      if (btns.length > 0) {
        const btn = btns[btns.length - 1];
        const r = btn.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`, returnByValue: true
  });

  if (compPos.result?.value) {
    const p = JSON.parse(compPos.result.value);
    console.log(`Clicking Compartir header button at x=${p.x}, y=${p.y}...`);
    await mouseClick(p.x, p.y);
  } else {
    console.log('Clicking Compartir header at fallback x=780, y=150...');
    await mouseClick(780, 150);
  }

  console.log('Waiting 15s for Instagram Reel to upload and publish...');
  await new Promise(r => setTimeout(r, 15000));

  const ss = await cdpCall('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_reel_spanish_published_final.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 Screenshot saved: ig_reel_spanish_published_final.png');

  ws.close();
}

main().catch(console.error);
