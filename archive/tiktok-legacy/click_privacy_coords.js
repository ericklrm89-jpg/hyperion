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
    const click = async (x, y) => {
      await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await wait(80);
      await call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await wait(80);
      await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    };

    ws.on('open', async () => {
      await call('Page.bringToFront');
      await wait(500);

      // Find first Only me dropdown coordinates
      const dropdownCoords = await call('Runtime.evaluate', {
        expression: `(() => {
          const els = Array.from(document.querySelectorAll('div, span, button, p, td'));
          const onlyMe = els.find(e => {
            const t = (e.textContent||'').trim();
            const r = e.getBoundingClientRect();
            return (t === 'Only me' || t === 'Solo yo' || t === 'Apenas eu') && r.width > 0 && r.top < 350;
          });
          if (onlyMe) {
            onlyMe.scrollIntoView({ block: 'center', behavior: 'auto' });
            const r = onlyMe.getBoundingClientRect();
            return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
          }
          return null;
        })()`, returnByValue: true
      });

      console.log('Dropdown coords:', dropdownCoords.result?.value);
      if (dropdownCoords.result?.value) {
        const p = JSON.parse(dropdownCoords.result.value);
        console.log(`🖱️ Clicking dropdown at physical coords: x=${p.x}, y=${p.y}`);
        await click(p.x, p.y);
        await wait(2000);

        // Take screen shot
        let ss = await call('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\tiktok_coords_dropdown_open.png', Buffer.from(ss.data, 'base64'));
        console.log('📸 Screenshot saved.');

        // Find "Everyone" option coords
        const everyoneCoords = await call('Runtime.evaluate', {
          expression: `(() => {
            const opts = Array.from(document.querySelectorAll('li, div, span, button, p'));
            const everyone = opts.find(o => {
              const t = (o.textContent||'').trim().toLowerCase();
              const r = o.getBoundingClientRect();
              return (t === 'everyone' || t === 'público' || t === 'public' || t === 'todos') && r.width > 0;
            });
            if (everyone) {
              const r = everyone.getBoundingClientRect();
              return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
            }
            return null;
          })()`, returnByValue: true
        });

        console.log('Everyone coords:', everyoneCoords.result?.value);
        if (everyoneCoords.result?.value) {
          const ep = JSON.parse(everyoneCoords.result.value);
          console.log(`🖱️ Clicking Everyone option at: x=${ep.x}, y=${ep.y}`);
          await click(ep.x, ep.y);
          await wait(4000);

          // Final verification
          ss = await call('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\tiktok_coords_final.png', Buffer.from(ss.data, 'base64'));
          console.log('📸 Final screenshot saved.');
        } else {
          console.log('Everyone option coords not found!');
        }
      } else {
        console.log('Dropdown coords not found!');
      }

      ws.close();
    });
  });
});
