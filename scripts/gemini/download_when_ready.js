const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
  const tab = tabs.find(t => t.url.includes('gemini.google.com') && t.type === 'page');
  if (!tab) throw new Error('No Gemini tab');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

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
  const wait = ms => new Promise(r => setTimeout(r, ms));

  console.log('⏳ Monitoring Gemini video generation completion...');
  await cdpCall('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: 'C:\\Users\\erick\\Downloads' });

  let downloaded = false;
  for (let i = 0; i < 30; i++) {
    console.log(`   Check attempt ${i + 1}/15...`);
    const dlPos = await cdpCall('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        const download = buttons.find(b => {
          const aria = (b.getAttribute('aria-label') || '').toLowerCase().trim();
          const txt = (b.innerText || b.textContent || '').toLowerCase().trim();
          return aria.includes('descargar') || aria.includes('download') || txt.includes('descargar') || txt.includes('download');
        });
        if (download) {
          download.scrollIntoView({ block: 'center' });
          const r = download.getBoundingClientRect();
          return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
        }
        return null;
      })()`, returnByValue: true
    });

    if (dlPos.result?.value) {
      const p = JSON.parse(dlPos.result.value);
      console.log(`🎯 Download button found at x=${p.x}, y=${p.y}! Clicking...`);
      await cdpCall('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
      await wait(80);
      await cdpCall('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
      await wait(80);
      await cdpCall('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
      await wait(4000);
      console.log('✅ Download initiated!');
      downloaded = true;
      break;
    }
    await wait(8000);
  }

  // Capture final status screenshot
  const ss = await cdpCall('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\gemini_en_ready.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 Status screenshot saved: gemini_en_ready.png');

  ws.close();
  if (!downloaded) console.log('⚠️ Video generation still in progress after wait time.');
}

main().catch(console.error);
