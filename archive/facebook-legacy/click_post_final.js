const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const OUT = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\';

http.get('http://127.0.0.1:9222/json', r => {
  let d = ''; r.on('data', c => d += c); r.on('end', () => {
    const tabs = JSON.parse(d);
    const fb = tabs.find(t => t.type === 'page' && t.url.includes('facebook'));
    if (!fb) return console.error('No FB tab');

    const ws = new WebSocket(fb.webSocketDebuggerUrl);
    let msgId = 1;
    const pending = new Map();

    ws.on('message', raw => {
      try {
        const msg = JSON.parse(raw);
        if (msg.id && pending.has(msg.id)) {
          const { res, t } = pending.get(msg.id);
          clearTimeout(t); pending.delete(msg.id); res(msg.result || {});
        }
      } catch(e) {}
    });

    const send = (method, params, ms) => new Promise((res, rej) => {
      const id = msgId++;
      const t = setTimeout(() => { pending.delete(id); rej(new Error(method + ' timeout')); }, ms || 15000);
      pending.set(id, { res, t });
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });

    ws.on('open', async () => {
      try {
        await send('Page.enable');

        // Find exact Post button bounding rect
        console.log('Finding Post button...');
        const btnInfo = await send('Runtime.evaluate', {
          expression: `(() => {
            const btns = Array.from(document.querySelectorAll('div[role="button"], button')).filter(e => {
              const txt = (e.textContent || '').trim().toLowerCase();
              const r = e.getBoundingClientRect();
              return (txt === 'post' || txt === 'publicar') && r.width > 0;
            });
            return JSON.stringify(btns.map(b => {
              const r = b.getBoundingClientRect();
              return { txt: b.textContent.trim(), x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2), w: r.width, h: r.height, visible: r.y < window.innerHeight };
            }));
          })()`
        });
        console.log('Post buttons:', btnInfo.result?.value);

        const btns = JSON.parse(btnInfo.result?.value || '[]');
        const postBtn = btns.find(b => b.txt.toLowerCase() === 'post' || b.txt.toLowerCase() === 'publicar');

        if (postBtn) {
          console.log(`Scrolling to Post button and clicking at x=${postBtn.x}, y=${postBtn.y}...`);
          // Scroll the modal to show the button
          await send('Runtime.evaluate', {
            expression: `document.querySelector('div[role="button"][tabindex="0"]').scrollIntoView && Array.from(document.querySelectorAll('div[role="button"]')).find(e => e.textContent.trim().toLowerCase() === 'post')?.scrollIntoView({block:'center'})`
          });
          await new Promise(r => setTimeout(r, 500));

          // Get updated coords after scroll
          const updated = await send('Runtime.evaluate', {
            expression: `(() => {
              const btn = Array.from(document.querySelectorAll('div[role="button"], button')).find(e => e.textContent.trim().toLowerCase() === 'post');
              if (!btn) return null;
              const r = btn.getBoundingClientRect();
              return JSON.stringify({ x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2) });
            })()`
          });
          
          const coords = updated.result?.value ? JSON.parse(updated.result.value) : postBtn;
          console.log(`Clicking Post at x=${coords.x}, y=${coords.y}...`);

          // CDP physical click
          await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: coords.x, y: coords.y });
          await new Promise(r => setTimeout(r, 100));
          await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: coords.x, y: coords.y, button: 'left', clickCount: 1 });
          await new Promise(r => setTimeout(r, 100));
          await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: coords.x, y: coords.y, button: 'left', clickCount: 1 });

          // Also DOM click
          await send('Runtime.evaluate', {
            expression: `Array.from(document.querySelectorAll('div[role="button"], button')).find(e => e.textContent.trim().toLowerCase() === 'post')?.click()`
          });
        } else {
          console.log('Post button not found, trying physical click at 353, 747...');
          await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 353, y: 747 });
          await new Promise(r => setTimeout(r, 100));
          await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 353, y: 747, button: 'left', clickCount: 1 });
          await new Promise(r => setTimeout(r, 100));
          await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 353, y: 747, button: 'left', clickCount: 1 });
        }

        console.log('Waiting 20s for Facebook to publish the Reel...');
        await new Promise(r => setTimeout(r, 20000));

        const ss = await send('Page.captureScreenshot', { format: 'png' }, 10000);
        fs.writeFileSync(OUT + 'fb_REEL_FINAL_POST_DONE.png', Buffer.from(ss.data, 'base64'));
        console.log('Saved fb_REEL_FINAL_POST_DONE.png');

        ws.close();
        process.exit(0);
      } catch(e) {
        console.error('ERR:', e.message);
        process.exit(1);
      }
    });
    ws.on('error', e => { console.error('WS err:', e.message); process.exit(1); });
  });
});
