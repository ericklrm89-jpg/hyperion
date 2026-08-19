const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
  const tab = tabs.find(t => t.url.includes('gemini.google.com') && t.type === 'page');
  if (!tab) throw new Error('No Gemini tab');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

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
  const wait = ms => new Promise(r => setTimeout(r, ms));

  console.log('Clicking (+) at 612, 362...');
  await cdpCall('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 612, y: 362 });
  await wait(80);
  await cdpCall('Input.dispatchMouseEvent', { type: 'mousePressed', x: 612, y: 362, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 612, y: 362, button: 'left', clickCount: 1 });
  await wait(2000);

  const ss = await cdpCall('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\popup_menu_es.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 Screenshot saved: popup_menu_es.png');

  const dump = await cdpCall('Runtime.evaluate', {
    expression: `(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const items = [];
      for (const el of all) {
        const text = (el.innerText || el.textContent || '').trim();
        const aria = (el.getAttribute('aria-label') || '').trim();
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && (text.length > 0 || aria.length > 0)) {
          if (rect.top > 200 && rect.top < 600 && rect.left > 300 && rect.left < 800) {
            items.push({
              tag: el.tagName,
              aria,
              text: text.slice(0, 50),
              x: Math.round(rect.left + rect.width/2),
              y: Math.round(rect.top + rect.height/2),
              w: Math.round(rect.width),
              h: Math.round(rect.height)
            });
          }
        }
      }
      return JSON.stringify(items);
    })()`, returnByValue: true
  });

  console.log('POPUP DUMP:');
  console.log(dump.result?.value);
  ws.close();
}

main().catch(console.error);
