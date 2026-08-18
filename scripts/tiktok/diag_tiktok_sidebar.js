const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

http.get('http://127.0.0.1:9222/json', r => {
  let d = ''; r.on('data', c => d += c); r.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('tiktok.com') && t.type === 'page');
    if (!tab) { console.log('No TikTok tab'); return; }
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    let id = 1;
    const call = (m, p = {}) => new Promise((res, rej) => {
      const i = id++;
      const h = data => { const r = JSON.parse(data); if (r.id === i) { ws.off('message', h); r.error ? rej(r.error) : res(r.result); } };
      ws.on('message', h);
      ws.send(JSON.stringify({ id: i, method: m, params: p }));
    });
    const wait = ms => new Promise(r => setTimeout(r, ms));

    ws.on('open', async () => {
      await call('Page.bringToFront');
      await wait(1000);

      const res = await call('Runtime.evaluate', {
        expression: `
          JSON.stringify(
            Array.from(document.querySelectorAll('button, a, div[role="button"]'))
            .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.left < 200; })
            .map(e => ({
              tag: e.tagName,
              txt: (e.textContent || '').trim().slice(0, 30),
              aria: e.getAttribute('aria-label') || '',
              x: Math.round(e.getBoundingClientRect().left + e.getBoundingClientRect().width / 2),
              y: Math.round(e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2)
            }))
          )
        `,
        returnByValue: true
      });
      const elements = JSON.parse(res.result.value);
      console.log('📋 TikTok sidebar elements (x < 200):');
      elements.forEach(e => console.log(`  ${e.tag} | x=${e.x} y=${e.y} | aria="${e.aria}" | txt="${e.t || e.txt}"`));

      ws.close();
    });
  });
});
