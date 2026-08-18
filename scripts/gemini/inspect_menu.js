const http = require('http');
const WebSocket = require('ws');

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

  console.log('Clicking (+) first...');
  await cdpCall('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 612, y: 362 });
  await wait(80);
  await cdpCall('Input.dispatchMouseEvent', { type: 'mousePressed', x: 612, y: 362, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 612, y: 362, button: 'left', clickCount: 1 });
  await wait(1500);

  console.log('Querying popup elements...');
  const res = await cdpCall('Runtime.evaluate', {
    expression: `(() => {
      const els = Array.from(document.querySelectorAll('mat-action-list button, mat-action-list a, mat-action-list div, mat-card button, mat-card a, mat-card div, [role="menuitem"], [role="option"]'));
      return JSON.stringify(els.map(el => ({
        tag: el.tagName,
        ariaLabel: el.getAttribute('aria-label') || '',
        text: (el.textContent || '').trim(),
        html: el.outerHTML.slice(0, 180)
      })));
    })()`, returnByValue: true
  });

  console.log('POPUP ELEMENTS:');
  const list = JSON.parse(res.result?.value || '[]');
  list.forEach((b, i) => {
    console.log(`[${i+1}] ${b.tag} | label="${b.ariaLabel}" | text="${b.text}" | html="${b.html}"`);
  });

  ws.close();
}

main().catch(console.error);
