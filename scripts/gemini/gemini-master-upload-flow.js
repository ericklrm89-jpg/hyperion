const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

// 4 Image Assets - NUEVOS STORYBOARDS
const logoPath = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_official_logo_1784899306001.png';
const hookPath = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_3d_new_hook_1784899716687.png';
const corePath = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_3d_new_core_1784899732605.png';
const climaxPath = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_3d_new_climax_1784899748976.png';

console.log('=======================================================');
console.log('🎬 HYPERION GEMINI: CAPA MANUS + 4 IMÁGENES + PROMPT');
console.log('ORDEN: Inyectar capa → Subir 4 imgs → Prompt → Enviar');
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
  // Inject Manus-style colored boxes + numbered badges via CDP
  const result = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        try { document.querySelectorAll('.hy-rr,.hy-st').forEach(e => e.remove()); } catch(e){}
        const style = document.createElement('style');
        style.className = 'hy-st';
        style.textContent = '.hy-rr{position:fixed;pointer-events:none;z-index:2147483647;font:bold 10px monospace;color:#fff;text-shadow:0 0 2px #000;padding:1px 3px;border:2px solid;border-radius:2px;box-sizing:border-box;overflow:hidden;}';
        document.head.appendChild(style);

        const COLORS = [
          {f:'rgba(255,0,0,0.35)',b:'#F00'},{f:'rgba(0,180,0,0.35)',b:'#0B0'},
          {f:'rgba(0,80,255,0.35)',b:'#05F'},{f:'rgba(200,180,0,0.35)',b:'#CB0'},
          {f:'rgba(180,0,180,0.35)',b:'#B0B'},{f:'rgba(0,180,180,0.35)',b:'#0BB'},
          {f:'rgba(255,120,0,0.35)',b:'#F80'},{f:'rgba(120,0,255,0.35)',b:'#80F'}
        ];

        // Use CDP-friendly: just draw on top of body, no shadow DOM needed for display
        const elements = Array.from(document.querySelectorAll('button, a, input, [role="button"], [role="menuitem"], [contenteditable="true"]'));
        const visible = elements.filter(e => {
          const r = e.getBoundingClientRect();
          return r.width > 8 && r.height > 8 && r.top >= 0 && r.top < window.innerHeight;
        });

        // Banner
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
          const label = (el.getAttribute('aria-label') || el.innerText || el.tagName).trim().slice(0, 14);
          badge.textContent = '[' + (i+1) + '] ' + label;
          document.body.appendChild(badge);
        });

        return visible.length;
      })()
    `,
    returnByValue: true
  });
  return result.result ? result.result.value : 0;
}

async function main() {
  // Get Gemini tab
  const tabsData = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const tab = tabsData.find(t => t.type === 'page' && t.url && t.url.includes('gemini.google.com') && !t.url.includes('RotateCookies'));
  if (!tab) throw new Error('No se encontró la pestaña de Gemini Web');

  console.log('📍 Pestaña encontrada:', tab.url);
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  await cdpCall(ws, 'Page.bringToFront');
  await cdpCall(ws, 'DOM.enable');

  // ═══════════════════════════════════════════════════════
  // PASO 1: INYECTAR CAPA MANUS CON RECUADROS Y BADGES
  // ═══════════════════════════════════════════════════════
  console.log('\n📐 PASO 1: Inyectando Capa Manus con recuadros de colores y badges [1..N]...');
  const badgeCount = await injectManusLayer(ws);
  console.log(`   ✅ Capa Manus activa: ${badgeCount} elementos badged`);
  await wait(800);

  let ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('step1_capa_manus.png', Buffer.from(ss.data, 'base64'));
  console.log('   📸 step1_capa_manus.png guardada');

  // ═══════════════════════════════════════════════════════
  // PASO 2: INYECTAR LAS 4 IMÁGENES VÍA CDP (MÉTODO QUE FUNCIONÓ)
  // El botón (+) dispara el menú, pero el input[type=file] ya existe en el DOM
  // y se puede inyectar directamente via setFileInputFiles
  // ═══════════════════════════════════════════════════════
  console.log('\n📎 PASO 2: Clickeando (+) y luego inyectando 4 imágenes vía CDP...');

  // Click (+) button using CDP Mouse dispatch at badge [241] position (~396, 502 from overlay)
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: 627, y: 502, button: 'left', clickCount: 1 });
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: 627, y: 502, button: 'left', clickCount: 1 });
  await wait(1200);

  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('step2a_plus_clicked.png', Buffer.from(ss.data, 'base64'));
  console.log('   📸 step2a_plus_clicked.png guardada');

  // Get DOM tree (pierce: true to find file inputs behind shadow DOM)
  console.log('   Buscando input[type=file] en árbol DOM pierced...');
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const inputNode = await cdpCall(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });

  if (inputNode && inputNode.nodeId) {
    await cdpCall(ws, 'DOM.setFileInputFiles', {
      nodeId: inputNode.nodeId,
      files: [logoPath, hookPath, corePath, climaxPath]
    });
    console.log(`   ✅ 4 imágenes inyectadas en nodeId=${inputNode.nodeId}`);
  } else {
    console.log('   ⚠️ No se encontró input[type=file] directo. Intentando con Input.synthesizeScrollGesture...');
    // Try clicking the "Subir archivos" menu option by dispatching click at center of popup menu
    await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 450, button: 'left', clickCount: 1 });
    await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: 700, y: 450, button: 'left', clickCount: 1 });
    await wait(800);

    const doc2 = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
    const inputNode2 = await cdpCall(ws, 'DOM.querySelector', { nodeId: doc2.root.nodeId, selector: 'input[type="file"]' });
    if (inputNode2 && inputNode2.nodeId) {
      await cdpCall(ws, 'DOM.setFileInputFiles', {
        nodeId: inputNode2.nodeId,
        files: [logoPath, hookPath, corePath, climaxPath]
      });
      console.log(`   ✅ 4 imágenes inyectadas (fallback) en nodeId=${inputNode2.nodeId}`);
    }
  }

  // Wait for thumbnails to render
  await wait(4000);
  await injectManusLayer(ws);
  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('step2b_4images_attached.png', Buffer.from(ss.data, 'base64'));
  console.log('   📸 step2b_4images_attached.png guardada - VERIFICAR MINIATURAS');

  // ═══════════════════════════════════════════════════════
  // PASO 3: ESCRIBIR EL PROMPT EN EL EDITOR
  // ═══════════════════════════════════════════════════════
  console.log('\n✍️ PASO 3: Escribiendo el prompt de animación en el editor...');
  const promptText = "Animate these 4 uploaded promotional images (Official FairDraw Logo, 3D Winner Hook, 3D AI Referee Core, 3D Friends Celebration Climax) into a high-energy 10-second vertical 9:16 promotional video for FairDraw online sweepstakes app. Show smooth transitions between the transparent sweepstakes hook, 100% provably fair algorithm, and the final YOU WON winner celebration climax.";

  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const ed = document.querySelector('div[contenteditable="true"], textarea, [role="textbox"]');
        if (ed) {
          ed.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, ${JSON.stringify(promptText)});
          ed.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      })()
    `,
    returnByValue: true
  });

  await wait(1500);
  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('step3_prompt_typed.png', Buffer.from(ss.data, 'base64'));
  console.log('   📸 step3_prompt_typed.png guardada - VERIFICAR PROMPT Y MINIATURAS ANTES DE ENVIAR');

  // ═══════════════════════════════════════════════════════
  // PASO 4: CLICKEAR EL BOTÓN ENVIAR
  // ═══════════════════════════════════════════════════════
  console.log('\n🚀 PASO 4: Clickeando el botón Enviar mensaje...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const send = buttons.find(b => {
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          return aria === 'enviar mensaje' || aria === 'send message' || aria === 'send' || aria === 'enviar';
        });
        if (send) { send.click(); return 'clicked: ' + send.getAttribute('aria-label'); }
        // Fallback: Enter key
        const ed = document.querySelector('[contenteditable="true"]');
        if (ed) {
          ed.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
          return 'enter sent';
        }
        return 'not found';
      })()
    `,
    returnByValue: true
  });

  await wait(5000);
  await injectManusLayer(ws);
  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('step4_prompt_sent_generating.png', Buffer.from(ss.data, 'base64'));
  console.log('   📸 step4_prompt_sent_generating.png guardada');

  console.log('\n=======================================================');
  console.log('🎉 FLUJO COMPLETO FINALIZADO - REVISAR CAPTURAS:');
  console.log('   step1_capa_manus.png');
  console.log('   step2a_plus_clicked.png');
  console.log('   step2b_4images_attached.png  ← CLAVE: ¿miniaturas?');
  console.log('   step3_prompt_typed.png');
  console.log('   step4_prompt_sent_generating.png');
  console.log('=======================================================');

  ws.close();
}

main().catch(err => console.error('❌ Error:', err));
