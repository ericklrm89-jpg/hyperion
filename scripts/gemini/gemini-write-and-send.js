const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

console.log('=======================================================');
console.log('🚀 GEMINI PASO FINAL: Escribir Prompt + Click [50] Enviar');
console.log('Las 4 imágenes ya están cargadas. Solo prompt + enviar.');
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

  // Capa Manus primero
  await injectManusLayer(ws);
  await wait(500);
  let ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('send_step0_current.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 send_step0_current.png — estado actual con miniaturas cargadas');

  // ═══ Escribir el prompt ═══════════════════════════════
  console.log('\n✍️  Escribiendo el prompt de animación...');
  const promptText = "Animate these 4 uploaded promotional images (Official FairDraw Logo, 3D Winner Hook, 3D AI Referee Core, 3D Friends Celebration Climax) into a high-energy 10-second vertical 9:16 promotional video for FairDraw online sweepstakes app. Show smooth transitions between the transparent sweepstakes hook, 100% provably fair algorithm, and the final YOU WON winner celebration climax.";

  // Click the editor first
  await mouseClick(ws, 930, 406);
  await wait(300);

  const typeResult = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const ed = document.querySelector('div[contenteditable="true"], textarea, p[data-placeholder]');
        if (ed) {
          ed.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, ${JSON.stringify(promptText)});
          ed.dispatchEvent(new Event('input', { bubbles: true }));
          return 'typed: ' + ed.tagName;
        }
        return 'no editor found';
      })()
    `,
    returnByValue: true
  });
  console.log('   Resultado:', typeResult.result ? typeResult.result.value : 'unknown');
  await wait(1000);

  // Capa Manus para ver el estado
  await injectManusLayer(ws);
  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('send_step1_prompt_written.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 send_step1_prompt_written.png — prompt escrito + imágenes');

  // ═══ Click en botón "Enviar" ══════════════════════════
  console.log('\n🚀 Enviando el mensaje...');

  // Find send button by aria-label (más específico)
  const sendResult = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        let found = null;
        for (const b of buttons) {
          const aria = (b.getAttribute('aria-label') || '').toLowerCase().trim();
          if (aria === 'enviar mensaje' || aria === 'send message' || aria === 'enviar' || aria === 'send') {
            const r = b.getBoundingClientRect();
            found = { aria, x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
            break;
          }
        }
        if (found) {
          // Click it directly
          const sendBtn = buttons.find(b => (b.getAttribute('aria-label') || '').toLowerCase().trim() === found.aria);
          if (sendBtn) sendBtn.click();
          return JSON.stringify(found);
        }
        // List all visible buttons near the bottom for debugging
        const visibleBtns = buttons.filter(b => {
          const r = b.getBoundingClientRect();
          return r.width > 5 && r.height > 5 && r.top > 400;
        }).map(b => {
          const r = b.getBoundingClientRect();
          return { aria: b.getAttribute('aria-label'), x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
        });
        return JSON.stringify({ notFound: true, bottomButtons: visibleBtns });
      })()
    `,
    returnByValue: true
  });

  const sendData = JSON.parse((sendResult.result && sendResult.result.value) || '{}');
  console.log('   Send button data:', JSON.stringify(sendData, null, 2));

  if (sendData.notFound) {
    // Try clicking at position of [50] Enviar badge from screenshot: ~(1237, 459)
    console.log('   ⚠️ No se encontró por aria. Usando coord (1237, 459) del badge [50]...');
    await mouseClick(ws, 1237, 459);
  }

  // Wait for Gemini to start generating
  await wait(7000);
  await injectManusLayer(ws);
  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('send_step2_generating.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 send_step2_generating.png — GENERANDO VIDEO');

  console.log('\n=======================================================');
  console.log('🎉 MENSAJE ENVIADO!');
  console.log('   Capturas:');
  console.log('   - send_step0_current.png    (estado con 4 imgs cargadas)');
  console.log('   - send_step1_prompt_written.png (prompt + imgs listo)');
  console.log('   - send_step2_generating.png (resultado/generación)');
  console.log('=======================================================');

  ws.close();
}

main().catch(err => console.error('❌ Error:', err));
