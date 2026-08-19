const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

http.get('http://localhost:9222/json', r => {
  let d = ''; r.on('data', c => d += c); r.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('instagram.com') && t.type === 'page');
    if (!tab) { console.log('No IG tab'); return; }
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
      await wait(500);

      // Screenshot actual
      const ss = await call('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_sidebar_diag.png', Buffer.from(ss.data, 'base64'));
      console.log('📸 Screenshot guardado');

      // Volcar sidebar elements (left < 200px)
      const res = await call('Runtime.evaluate', {
        expression: `
          JSON.stringify(
            Array.from(document.querySelectorAll('a, button, [role="button"], [role="link"], div[tabindex]'))
            .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.left < 200; })
            .map(e => ({
              a: e.getAttribute('aria-label'),
              t: (e.textContent || '').trim().slice(0, 25),
              tag: e.tagName,
              x: Math.round(e.getBoundingClientRect().left + e.getBoundingClientRect().width / 2),
              y: Math.round(e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2)
            })).slice(0, 20)
          )
        `,
        returnByValue: true
      });
      const elements = JSON.parse(res.result.value);
      console.log('\n📋 Sidebar elements (x < 200):');
      elements.forEach(e => console.log(`  ${e.tag} | x=${e.x} y=${e.y} | aria="${e.a}" | txt="${e.t}"`));

      ws.close();
    });
  });
});
