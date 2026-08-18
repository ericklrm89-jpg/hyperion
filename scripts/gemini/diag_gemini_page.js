/**
 * HYPERION — Diagnostico de Gemini Web
 * Toma un screenshot e imprime TODOS los elementos interactivos visibles
 */
const http = require('http');
const fs   = require('fs');
const WebSocket = require('ws');

let cdpId = 1;
function cdpCall(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = cdpId++;
    const h = (data) => {
      try {
        const r = JSON.parse(data);
        if (r.id === id) {
          ws.removeListener('message', h);
          r.error ? reject(new Error(JSON.stringify(r.error))) : resolve(r.result || {});
        }
      } catch(e) {}
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)));
    }).on('error', rej);
  });

  const tab = tabs.find(t => t.type === 'page' && t.url.includes('gemini.google.com'));
  if (!tab) throw new Error('No se encontró la pestaña de Gemini.');
  console.log('✅ Tab Gemini:', tab.url);

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));

  await cdpCall(ws, 'Page.bringToFront');
  await wait(1000);

  // Screenshot de diagnóstico
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\gemini_diag_01.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 Screenshot guardado: gemini_diag_01.png');

  // Dump de todos los botones/interactivos visibles
  const dump = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const results = [];
      const els = document.querySelectorAll('button, [role="button"], [aria-label], input, a[href], [tabindex]');
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          results.push({
            tag: el.tagName,
            ariaLabel: el.getAttribute('aria-label') || '',
            text: (el.textContent || '').trim().substring(0, 60),
            x: Math.round(r.left + r.width/2),
            y: Math.round(r.top + r.height/2),
            w: Math.round(r.width),
            h: Math.round(r.height)
          });
        }
      }
      return JSON.stringify(results.slice(0, 50));
    })()`, returnByValue: true
  });

  const elements = JSON.parse(dump.result?.value || '[]');
  console.log('\n📋 Elementos interactivos visibles:');
  elements.forEach((e, i) => {
    console.log(`  [${i+1}] ${e.tag} | "${e.ariaLabel}" | "${e.text}" | x=${e.x}, y=${e.y} | ${e.w}x${e.h}`);
  });

  // Check for file inputs specifically
  const fileInputs = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const inputs = document.querySelectorAll('input[type="file"]');
      return JSON.stringify(Array.from(inputs).map(i => ({
        name: i.name,
        accept: i.accept,
        visible: i.getBoundingClientRect().width > 0
      })));
    })()`, returnByValue: true
  });
  console.log('\n📁 Input[type=file] encontrados:', fileInputs.result?.value);

  ws.close();
}

main().catch(console.error);
