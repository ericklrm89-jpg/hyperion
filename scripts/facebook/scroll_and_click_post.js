const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  const tab = tabs.find(t => t.type==='page' && t.url.includes('facebook.com'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));

  let cdpId = 1;
  const cdpCall = (method, params = {}) => new Promise((resolve, reject) => {
    const id = cdpId++;
    const h = (data) => {
      const r = JSON.parse(data);
      if (r.id === id) { ws.off('message', h); r.error ? reject(new Error(JSON.stringify(r.error))) : resolve(r.result || {}); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });

  const mouseClick = async (x, y) => {
    await cdpCall('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await new Promise(r => setTimeout(r, 80));
    await cdpCall('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await new Promise(r => setTimeout(r, 80));
    await cdpCall('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };

  console.log('Scrolling left pane & dispatching Post click...');
  const coords = await cdpCall('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      const postBtn = btns.find(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        return txt === 'post' || txt === 'publicar';
      });
      if (postBtn) {
        let parent = postBtn.parentElement;
        while (parent) {
          if (parent.scrollHeight > parent.clientHeight) {
            parent.scrollTop = parent.scrollHeight;
          }
          parent = parent.parentElement;
        }
        postBtn.scrollIntoView({ block: 'center' });
        postBtn.click();
        const r = postBtn.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`, returnByValue: true
  });

  if (coords.result?.value) {
    const p = JSON.parse(coords.result.value);
    console.log(`Clicking Post button at x=${p.x}, y=${p.y}...`);
    await mouseClick(p.x, p.y);
  }

  await new Promise(r => setTimeout(r, 12000));
  const ss = await cdpCall('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_post_submitted.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 Screenshot saved: fb_post_submitted.png');

  ws.close();
}

main().catch(console.error);
