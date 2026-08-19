const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Read the compiled dynamic overlay script from dist
const overlayJs = fs.readFileSync(path.join(__dirname, '..', '..', 'dist', 'layers', 'overlay.js'), 'utf8');

// Extract the raw script string inside ORIGINAL_HYPERION_OVERLAY_SCRIPT
// dist contains: exports.ORIGINAL_HYPERION_OVERLAY_SCRIPT = `...`;
// We will evaluate the inner script contents.
let rawOverlayScript = overlayJs;
const match = overlayJs.match(/exports\.ORIGINAL_HYPERION_OVERLAY_SCRIPT\s*=\s*`([\s\S]+?)`;/);
if (match) {
  rawOverlayScript = match[1];
}

console.log('=======================================================');
console.log('🎬 INJECTING DYNAMIC MANUS LAYER (250MS LOOP)');
console.log('=======================================================');

function cdpCall(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 999999);
    const handler = (data) => {
      try {
        const res = JSON.parse(data);
        if (res.id === id) {
          ws.removeListener('message', handler);
          if (res.error) reject(new Error(JSON.stringify(res.error)));
          else resolve(res.result || {});
        }
      } catch(e) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const tabsData = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const tab = tabsData.find(t => t.type === 'page' && t.url && t.url.includes('gemini.google.com') && !t.url.includes('RotateCookies'));
  if (!tab) throw new Error('No tab');
  console.log('📍 Pestaña:', tab.url);

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  await cdpCall(ws, 'Page.bringToFront');

  console.log('📐 Inyectando script de capa dinámica...');
  // Clean first
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      if (window.__HY_SINGLE_TIMER) { clearInterval(window.__HY_SINGLE_TIMER); window.__HY_SINGLE_TIMER = null; }
      document.querySelectorAll('.hy-rr,.hy-st,.hy-el,.hy-tp').forEach(e => e.remove());
    `
  });
  await wait(200);

  // Inject the actual dynamic loop script
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: rawOverlayScript
  });
  console.log('✅ Capa dinámica Manus con setInterval de 250ms activa!');

  await wait(500);

  // Capture screenshot to verify it renders and to check the video status
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('dynamic_overlay_check.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 Screenshot guardado en dynamic_overlay_check.png');

  ws.close();
}

main().catch(err => console.error('❌ Error:', err));
