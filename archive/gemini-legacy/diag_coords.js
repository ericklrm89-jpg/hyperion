const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

http.get('http://localhost:9222/json', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', async () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('gemini'));
    if (!tab) { console.log('No Gemini tab'); return; }
    console.log('Tab:', tab.url);

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    let msgId = 0;
    const send = (method, params={}) => new Promise(res => {
      const id = ++msgId;
      ws.send(JSON.stringify({ id, method, params }));
      const h = raw => {
        const m = JSON.parse(raw);
        if (m.id === id) { ws.removeListener('message', h); res(m.result); }
      };
      ws.on('message', h);
    });

    await new Promise(res => ws.on('open', res));
    console.log('WS open');

    // Get all interactive elements and find upload-related ones
    const result = await send('Runtime.evaluate', {
      expression: `(() => {
        const all = Array.from(document.querySelectorAll('button, a, [role="menuitem"], [role="option"], [role="button"]'));
        const hits = all.filter(e => {
          const t = (e.textContent || '').trim().toLowerCase();
          const a = (e.getAttribute('aria-label') || '').toLowerCase();
          return t.includes('subir') || a.includes('subir') || t.includes('upload') || a.includes('upload') || a.includes('herramient') || t.includes('herramient');
        });
        return hits.map(e => {
          const r = e.getBoundingClientRect();
          return JSON.stringify({
            text: e.textContent.trim().slice(0, 50),
            aria: e.getAttribute('aria-label'),
            x: Math.round(r.left + r.width / 2),
            y: Math.round(r.top + r.height / 2),
            w: Math.round(r.width),
            h: Math.round(r.height),
            visible: r.width > 0 && r.height > 0
          });
        }).join('\n');
      })()`,
      returnByValue: true
    });

    console.log('\n=== UPLOAD BUTTONS ===');
    console.log(result?.value || '(none)');

    // Also get the (+) button
    const plusResult = await send('Runtime.evaluate', {
      expression: `(() => {
        const all = Array.from(document.querySelectorAll('button, [role="button"]'));
        const btn = all.find(e => {
          const a = (e.getAttribute('aria-label') || '').toLowerCase();
          return a.includes('herramient') || a.includes('upload') || a.includes('subid');
        });
        if (!btn) return 'NOT FOUND';
        const r = btn.getBoundingClientRect();
        return JSON.stringify({
          text: btn.textContent.trim().slice(0, 50),
          aria: btn.getAttribute('aria-label'),
          x: Math.round(r.left + r.width / 2),
          y: Math.round(r.top + r.height / 2)
        });
      })()`,
      returnByValue: true
    });
    console.log('\n=== (+) BUTTON ===');
    console.log(plusResult?.value);

    // Screenshot
    const ss = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('diag_coords.png', Buffer.from(ss.data, 'base64'));
    console.log('\nScreenshot: diag_coords.png');

    ws.close();
  });
});
