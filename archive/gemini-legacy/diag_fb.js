const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

http.get('http://localhost:9222/json', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', async () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('facebook.com'));
    if (!tab) {
      console.log('No Facebook tab found!');
      return;
    }
    console.log('Connecting to tab:', tab.url);
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    let msgId = 0;
    const send = (method, params = {}) => new Promise(res => {
      const id = ++msgId;
      ws.send(JSON.stringify({ id, method, params }));
      const h = raw => {
        const m = JSON.parse(raw);
        if (m.id === id) {
          ws.removeListener('message', h);
          res(m.result || m.error);
        }
      };
      ws.on('message', h);
    });

    await new Promise(res => ws.on('open', res));
    console.log('WebSocket open.');

    // Capture screenshot
    const ss = await send('Page.captureScreenshot', { format: 'png' });
    if (ss.data) {
      fs.writeFileSync('fb_diag_initial.png', Buffer.from(ss.data, 'base64'));
      console.log('Screenshot saved to fb_diag_initial.png');
    } else {
      console.log('Error taking screenshot:', ss);
    }

    // Inspect visible inputs and buttons on Facebook (sorted by Y)
    const dump = await send('Runtime.evaluate', {
      expression: `(() => {
        const els = Array.from(document.querySelectorAll('button, a, input, [role="button"], [role="link"], [role="textbox"], div[contenteditable="true"]'));
        const visible = els.filter(e => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.top < 1500;
        }).map(e => {
          const r = e.getBoundingClientRect();
          return {
            tag: e.tagName,
            role: e.getAttribute('role'),
            text: (e.textContent||'').trim().replace(/\\s+/g, ' ').slice(0, 40),
            aria: e.getAttribute('aria-label'),
            placeholder: e.getAttribute('placeholder'),
            x: Math.round(r.left + r.width/2),
            y: Math.round(r.top + r.height/2),
            w: Math.round(r.width),
            h: Math.round(r.height),
            top: Math.round(r.top)
          };
        });
        visible.sort((a,b) => a.top - b.top);
        return visible.map(e => JSON.stringify(e)).join('\\n');
      })()`,
      returnByValue: true
    });

    console.log('\n=== TOP VISIBLE INTERACTIVE ELEMENTS ===');
    console.log(dump?.result?.value || '(none)');

    ws.close();
  });
});
