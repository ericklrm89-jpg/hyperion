const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const OUT = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\';

http.get('http://127.0.0.1:9222/json', r => {
  let d = ''; r.on('data', c => d += c); r.on('end', () => {
    const tabs = JSON.parse(d);
    const fb = tabs.find(t => t.type === 'page' && t.url.includes('facebook'));
    const ws = new WebSocket(fb.webSocketDebuggerUrl);
    let id = 1; const q = new Map();

    ws.on('message', raw => {
      try {
        const msg = JSON.parse(raw);
        if (q.has(msg.id)) { const { res, t } = q.get(msg.id); clearTimeout(t); q.delete(msg.id); res(msg.result || {}); }
      } catch(e) {}
    });

    const call = (m, p, ms) => new Promise((res, rej) => {
      const i = id++;
      const t = setTimeout(() => { q.delete(i); rej(new Error(m + ' timeout')); }, ms || 10000);
      q.set(i, { res, t });
      ws.send(JSON.stringify({ id: i, method: m, params: p || {} }));
    });

    ws.on('open', async () => {
      try {
        await call('Page.enable');

        // Click the AI label toggle to enable it
        console.log('1. Clicking Add AI label toggle...');
        const toggleResult = await call('Runtime.evaluate', {
          expression: `(() => {
            // Find the toggle switch for AI label
            const toggles = Array.from(document.querySelectorAll('input[type="checkbox"], div[role="switch"]'));
            if (toggles.length > 0) {
              toggles[0].click();
              return 'Toggled: ' + toggles.length + ' toggles found';
            }
            // Try clicking the area at AI label
            const aiLabel = Array.from(document.querySelectorAll('*')).find(e => 
              (e.textContent || '').includes('Add AI label') && e.getBoundingClientRect().width > 0
            );
            if (aiLabel) {
              const r = aiLabel.getBoundingClientRect();
              return JSON.stringify({ x: Math.round(r.right - 30), y: Math.round(r.top + r.height/2) });
            }
            return null;
          })()`
        });
        console.log('Toggle result:', toggleResult.result?.value);

        // Physical click on the toggle area (right side of "Add AI label" row, ~x=400, y=520)
        console.log('2. Physical click on AI label toggle at x=400, y=520...');
        await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 400, y: 520 });
        await new Promise(r => setTimeout(r, 100));
        await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: 400, y: 520, button: 'left', clickCount: 1 });
        await new Promise(r => setTimeout(r, 100));
        await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 400, y: 520, button: 'left', clickCount: 1 });
        await new Promise(r => setTimeout(r, 1000));

        // Take screenshot to see if toggle is now ON
        let ss = await call('Page.captureScreenshot', { format: 'png' }, 10000);
        fs.writeFileSync(OUT + 'fb_ai_toggle_state.png', Buffer.from(ss.data, 'base64'));
        console.log('Saved fb_ai_toggle_state.png');

        // Now click Post button at x=315, y=716
        console.log('3. Clicking Post button at x=315, y=716...');
        await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 315, y: 716 });
        await new Promise(r => setTimeout(r, 100));
        await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: 315, y: 716, button: 'left', clickCount: 1 });
        await new Promise(r => setTimeout(r, 100));
        await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 315, y: 716, button: 'left', clickCount: 1 });

        // Also DOM click
        await call('Runtime.evaluate', {
          expression: `Array.from(document.querySelectorAll('div[role="button"], button')).find(e => e.textContent.trim().toLowerCase() === 'post')?.click()`
        });

        console.log('4. Waiting 20s for Facebook to publish...');
        await new Promise(r => setTimeout(r, 20000));

        ss = await call('Page.captureScreenshot', { format: 'png' }, 10000);
        fs.writeFileSync(OUT + 'fb_REEL_AI_LABEL_POSTED.png', Buffer.from(ss.data, 'base64'));
        console.log('Saved fb_REEL_AI_LABEL_POSTED.png');

        ws.close();
        process.exit(0);
      } catch(e) {
        console.error('ERR:', e.message);
        process.exit(1);
      }
    });
    ws.on('error', e => { console.error(e.message); process.exit(1); });
  });
});
