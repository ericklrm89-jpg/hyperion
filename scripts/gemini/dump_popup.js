const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

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

async function clickXY(ws, x, y) {
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)));
    }).on('error', rej);
  });
  
  const tab = tabs.find(t => t.type === 'page' && t.url.includes('gemini.google.com'));
  if (!tab) throw new Error('No Gemini tab');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'DOM.enable');
  await cdpCall(ws, 'Page.bringToFront');
  await wait(500);

  // Hacemos clic directo en el botón (+) usando su aria-label exacto
  console.log('🎯 Clic en "Cargas y herramientas" via DOM nativo...');
  const clicked = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('[aria-label="Cargas y herramientas"]');
      if (btn) { btn.click(); return true; }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('   Resultado clic:', clicked.result?.value);
  await wait(2000);

  // Volcar todos los elementos visibles después del clic para ver las opciones del popup
  const result = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const all = Array.from(document.querySelectorAll('button, a, div[role="menuitem"], div[role="option"], li, span[role="button"]'));
      const data = all.map((e, i) => {
        const rect = e.getBoundingClientRect();
        if (rect.width < 5 || rect.height < 5) return null;
        return {
          i,
          tag: e.tagName,
          role: e.getAttribute('role'),
          aria: (e.getAttribute('aria-label')||'').slice(0, 60),
          txt: (e.textContent||'').replace(/\\s+/g,' ').trim().slice(0, 50),
          x: Math.round(rect.left + rect.width/2),
          y: Math.round(rect.top + rect.height/2),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        };
      }).filter(Boolean);
      return JSON.stringify(data);
    })()`,
    returnByValue: true
  });

  const elements = JSON.parse(result.result.value);
  console.log('\\n📋 ELEMENTOS VISIBLES TRAS EL CLIC EN (+):');
  elements.forEach(e => {
    const isNew = e.y < 350; // elementos por encima del botón
    console.log(`  ${isNew ? '>>> ' : '    '}[${e.i}] ${e.tag}/${e.role} | x=${e.x} y=${e.y} | ${e.w}x${e.h} | aria="${e.aria}" | txt="${e.txt}"`);
  });

  // Screenshot
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\gemini_popup_dump.png', Buffer.from(ss.data, 'base64'));
  console.log('\\n📸 Captura guardada: gemini_popup_dump.png');

  ws.close();
}
main().catch(console.error);
