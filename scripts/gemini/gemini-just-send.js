const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

console.log('=======================================================');
console.log('🚀 GEMINI JUST SEND: Clickeando Enviar Mensaje');
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

async function injectManusLayer(ws) {
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        try { document.querySelectorAll('.hy-rr,.hy-st').forEach(e => e.remove()); } catch(e){}
        const style = document.createElement('style');
        style.className = 'hy-st';
        style.textContent = '.hy-rr{position:fixed;pointer-events:none;z-index:2147483647;font:bold 10px monospace;color:#fff;text-shadow:0 0 2px #000;padding:1px 3px;border:2px solid;border-radius:2px;box-sizing:border-box;overflow:hidden;}';
        document.head.appendChild(style);
        const COLORS = [{f:'rgba(255,0,0,0.35)',b:'#F00'},{f:'rgba(0,180,0,0.35)',b:'#0B0'},{f:'rgba(0,80,255,0.35)',b:'#05F'},{f:'rgba(200,180,0,0.35)',b:'#CB0'},{f:'rgba(180,0,180,0.35)',b:'#B0B'},{f:'rgba(0,180,180,0.35)',b:'#0BB'},{f:'rgba(255,120,0,0.35)',b:'#F80'},{f:'rgba(120,0,255,0.35)',b:'#80F'}];
        const elements = Array.from(document.querySelectorAll('button, a, input, [role="button"], [role="menuitem"], [contenteditable="true"]'));
        const visible = elements.filter(e => { const r = e.getBoundingClientRect(); return r.width > 8 && r.height > 8 && r.top >= 0 && r.top < window.innerHeight; });
        const banner = document.createElement('div');
        banner.className = 'hy-rr';
        banner.style.cssText = 'top:2px;left:50%;transform:translateX(-50%);padding:4px 14px;background:rgba(0,0,0,0.92);border-radius:6px;color:#0f0;border-color:#0f0;font:bold 13px monospace;white-space:nowrap;';
        banner.textContent = 'CAPA ACTIVA: GEMINI WEB [' + visible.length + ' ELEMENTOS BADGED]';
        document.body.appendChild(banner);
        visible.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          const c = COLORS[i % COLORS.length];
          const badge = document.createElement('div');
          badge.className = 'hy-rr';
          badge.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;background:' + c.f + ';border-color:' + c.b + ';';
          badge.textContent = '[' + (i+1) + '] ' + (el.getAttribute('aria-label') || el.innerText || el.tagName).trim().slice(0, 14);
          document.body.appendChild(badge);
        });
      })()
    `
  });
}

async function mouseClick(ws, x, y) {
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function main() {
  const tabsData = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const tab = tabsData.find(t => t.type === 'page' && t.url && t.url.includes('gemini.google.com') && !t.url.includes('RotateCookies'));
  if (!tab) throw new Error('No se encontró tab de Gemini');
  console.log('📍 Pestaña:', tab.url);

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  await cdpCall(ws, 'Page.bringToFront');

  // Escribir/asegurar el prompt y ver el botón Enviar
  console.log('\n🔍 Buscando el botón Enviar...');
  const sendPos = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const sendBtn = buttons.find(b => {
          const aria = (b.getAttribute('aria-label') || '').toLowerCase().trim();
          return aria === 'enviar mensaje' || aria === 'send message' || aria === 'enviar' || aria === 'send';
        });
        if (sendBtn) {
          const r = sendBtn.getBoundingClientRect();
          return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), aria: sendBtn.getAttribute('aria-label') });
        }
        return null;
      })()
    `,
    returnByValue: true
  });

  let x = 787, y = 692; // Fallback desde la captura
  if (sendPos.result && sendPos.result.value) {
    const pos = JSON.parse(sendPos.result.value);
    x = pos.x;
    y = pos.y;
    console.log(`   ✅ Botón Enviar encontrado: aria="${pos.aria}" en (${x}, ${y})`);
  } else {
    console.log(`   ⚠️ Botón Enviar no encontrado por JS, usando fallback (${x}, ${y})`);
  }

  // Click Enviar por mouse
  console.log(`\n🚀 Haciendo click en Enviar en (${x}, ${y})...`);
  await mouseClick(ws, x, y);
  await wait(1000);

  // También ejecutamos por JS en caso de que el click por coordenadas falle
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const sendBtn = buttons.find(b => {
          const aria = (b.getAttribute('aria-label') || '').toLowerCase().trim();
          return aria === 'enviar mensaje' || aria === 'send message' || aria === 'enviar' || aria === 'send';
        });
        if (sendBtn) {
          sendBtn.click();
          return 'JS click executed';
        }
        return 'not clicked via JS';
      })()
    `,
    returnByValue: true
  });

  console.log('   Esperando respuesta de Gemini (generando vídeo)...');
  await wait(7000);

  await injectManusLayer(ws);
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('just_sent_result.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 just_sent_result.png guardada');

  ws.close();
}

main().catch(err => console.error('❌ Error:', err));
