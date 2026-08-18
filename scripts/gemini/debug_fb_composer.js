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
        if (r.id === id) {
          ws.removeListener('message', h);
          r.error ? reject(new Error(JSON.stringify(r.error))) : resolve(r.result || {});
        }
      } catch(e) {}
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

http.get('http://localhost:9222/json', r => {
  let d = ''; r.on('data', c => d += c);
  r.on('end', async () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('facebook.com'));
    if (!tab) return;
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(res => ws.on('open', res));
    console.log('WS open');

    await cdpCall(ws, 'Page.enable');

    // Tomar screenshot
    const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('fb_composer_debug.png', Buffer.from(ss.data, 'base64'));
    console.log('Saved fb_composer_debug.png');

    // Dump visible texts
    const dump = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const divs = Array.from(document.querySelectorAll('span, div, button, a, [role="tab"]'));
        return divs.filter(d => {
          const r = d.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.top < 1500;
        }).map(d => {
          const txt = (d.textContent||'').trim().replace(/\\s+/g, ' ').slice(0, 50);
          return JSON.stringify({
            tag: d.tagName,
            text: txt,
            x: Math.round(d.getBoundingClientRect().left),
            y: Math.round(d.getBoundingClientRect().top),
            w: Math.round(d.getBoundingClientRect().width),
            h: Math.round(d.getBoundingClientRect().height)
          });
        }).slice(0, 50).join('\\n');
      })()`,
      returnByValue: true
    });
    console.log('\n=== VISIBLE ELEMENTS ===');
    console.log(dump?.result?.value);

    ws.close();
  });
});
