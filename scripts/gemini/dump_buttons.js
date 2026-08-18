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
  await cdpCall(ws, 'Page.bringToFront');
  await wait(500);

  // Primero limpiar chat
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button, a, div[role="button"], span')).find(e => {
        const txt = (e.textContent||'').toLowerCase();
        const aria = (e.getAttribute('aria-label')||'').toLowerCase();
        return txt.includes('nuevo chat') || txt.includes('new chat') || aria.includes('conversación') || txt.includes('nueva conversa');
      });
      if (btn) btn.click();
    })()`
  });
  await wait(6000);

  // Volcar TODOS los botones en la página con sus datos
  const result = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
      const data = buttons.map((b, i) => {
        const rect = b.getBoundingClientRect();
        if (rect.width < 5 || rect.height < 5) return null;
        return {
          i,
          tag: b.tagName,
          role: b.getAttribute('role'),
          aria: (b.getAttribute('aria-label')||'').slice(0, 50),
          title: (b.getAttribute('title')||'').slice(0, 30),
          txt: (b.textContent||'').replace(/\\s+/g,' ').trim().slice(0, 40),
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

  const buttons = JSON.parse(result.result.value);
  console.log('📋 TODOS LOS BOTONES EN LA PÁGINA LIMPIA:');
  buttons.forEach(b => {
    console.log(`  [${b.i}] ${b.tag} | x=${b.x} y=${b.y} | ${b.w}x${b.h} | aria="${b.aria}" | txt="${b.txt}"`);
  });

  // Screenshot
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\gemini_buttons_dump.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 Captura guardada: gemini_buttons_dump.png');

  ws.close();
}
main().catch(console.error);
