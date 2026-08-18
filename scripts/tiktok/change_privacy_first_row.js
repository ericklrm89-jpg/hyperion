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
      await wait(500);

      console.log('👇 Clicking Only me / Solo yo dropdown on first row...');
      const dropdownClicked = await call('Runtime.evaluate', {
        expression: `(() => {
          const els = Array.from(document.querySelectorAll('div, span, button'));
          const onlyMe = els.find(e => {
            const t = (e.textContent||'').trim();
            const r = e.getBoundingClientRect();
            return (t === 'Only me' || t === 'Solo yo' || t === 'Apenas eu') && r.width > 0 && r.top < 350;
          });
          if (onlyMe) {
            onlyMe.click();
            return 'clicked';
          }
          return 'not found';
        })()`, returnByValue: true
      });
      console.log('Dropdown click result:', dropdownClicked.result?.value);
      await wait(1500);

      // Take screenshot of open dropdown
      let ss = await call('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\tiktok_dropdown_open.png', Buffer.from(ss.data, 'base64'));

      // Click Everyone / Todo el mundo option
      console.log('👇 Selecting Todo el mundo / Everyone...');
      const optionClicked = await call('Runtime.evaluate', {
        expression: `(() => {
          const opts = Array.from(document.querySelectorAll('li, div, span, button, [role="option"]'));
          const everyone = opts.find(o => {
            const t = (o.textContent||'').trim().toLowerCase();
            const r = o.getBoundingClientRect();
            return (t === 'everyone' || t === 'todo el mundo' || t === 'público' || t === 'public' || t === 'todos') && r.width > 0;
          });
          if (everyone) {
            everyone.click();
            return 'clicked';
          }
          return 'not found';
        })()`, returnByValue: true
      });
      console.log('Option click result:', optionClicked.result?.value);
      await wait(4000);

      // Final screenshot
      ss = await call('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\tiktok_privacy_changed.png', Buffer.from(ss.data, 'base64'));
      console.log('📸 Final privacy screenshot saved.');

      ws.close();
    });
  });
});
