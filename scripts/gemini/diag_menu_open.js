const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

http.get('http://localhost:9222/json', r => {
  let d = ''; r.on('data', c => d += c);
  r.on('end', async () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('gemini'));
    console.log('Tab:', tab.url);
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    let id = 0;
    const send = (method, params = {}) => new Promise(res => {
      const mid = ++id;
      ws.send(JSON.stringify({ id: mid, method, params }));
      const h = raw => { const m = JSON.parse(raw); if (m.id === mid) { ws.removeListener('message', h); res(m.result); } };
      ws.on('message', h);
    });

    await new Promise(res => ws.on('open', res));

    // 1. Find (+) button dynamically via JS
    const coordsRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const input = document.querySelector('[contenteditable="true"],[role="textbox"],textarea');
        if (!input) return null;
        let container = input.parentElement;
        for (let i = 0; i < 8; i++) {
          if (!container) break;
          const btns = Array.from(container.querySelectorAll('button')).filter(b => {
            const a = (b.getAttribute('aria-label')||'').toLowerCase();
            const r = b.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.top > 200 &&
              (a.includes('herramient') || a.includes('subida') || a.includes('upload') || a.includes('tool') || a.includes('attach'));
          });
          if (btns.length > 0) {
            const b = btns[0]; const r = b.getBoundingClientRect();
            return JSON.stringify({ x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2), aria: b.getAttribute('aria-label') });
          }
          container = container.parentElement;
        }
        return null;
      })()`, returnByValue: true
    });
    
    if (!coordsRes?.value) { console.log('❌ (+) not found'); ws.close(); return; }
    const pc = JSON.parse(coordsRes.value);
    console.log(`\n✅ (+) found: aria="${pc.aria}" at (${pc.x}, ${pc.y})`);

    // 2. Screenshot before click
    const ss0 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('diag_before_click.png', Buffer.from(ss0.data, 'base64'));
    console.log('📸 Before click: diag_before_click.png');

    // 3. Physical CDP click on (+)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pc.x, y: pc.y, button: 'none' });
    await new Promise(r => setTimeout(r, 100));
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pc.x, y: pc.y, button: 'left', clickCount: 1 });
    await new Promise(r => setTimeout(r, 50));
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pc.x, y: pc.y, button: 'left', clickCount: 1 });
    console.log('🖱️  Physical click sent');

    // 4. Poll DOM every 300ms for 3s — dump all visible elements
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 300));
      const dump = await send('Runtime.evaluate', {
        expression: `(() => {
          const all = Array.from(document.querySelectorAll('button,a,[role="menuitem"],[role="option"],[role="listitem"],li'));
          const visible = all.filter(e => {
            const r = e.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          }).map(e => {
            const r = e.getBoundingClientRect();
            return (e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,50) + ' @(' + Math.round(r.left+r.width/2) + ',' + Math.round(r.top+r.height/2) + ')';
          });
          return visible.join(' | ');
        })()`, returnByValue: true
      });
      console.log(`\n[t+${(i+1)*300}ms] Elements:`, dump?.value?.slice(0, 800) || '(none)');
    }

    // 5. Screenshot after
    const ss1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('diag_after_click.png', Buffer.from(ss1.data, 'base64'));
    console.log('\n📸 After click: diag_after_click.png');
    ws.close();
  });
});
