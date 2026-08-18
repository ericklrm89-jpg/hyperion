const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

// ════════════════════════════════════════════════
// COORDENADAS MAPEADAS DESDE SCREENSHOTS REALES
// v2_step1_overlay.png con badges [1..13]:
//   [11] (+) button: ~(624, 372) en pantalla limpia 1366x768
//   [10] Textarea:   ~(869, 372)
//   [12] Flash btn:  ~(1165, 372)
//   [13] Mic btn:    ~(1240, 372)
// ════════════════════════════════════════════════

// 4 Image Assets
const logoPath   = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_official_logo_1784899306001.png';
const hookPath   = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_3d_new_hook_1784899716687.png';
const corePath   = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_3d_new_core_1784899732605.png';
const climaxPath = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_3d_new_climax_1784899748976.png';

console.log('=======================================================');
console.log('🎬 GEMINI v3: Coordenadas Exactas → 4 Imgs → Prompt → Enviar');
console.log('Método: Coordenadas CDP verificadas con capa Manus');
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
        const elements = Array.from(document.querySelectorAll('button, a, input, [role="button"], [role="menuitem"], [contenteditable="true"]'));
        const visible = elements.filter(e => {
          const r = e.getBoundingClientRect();
          return r.width > 8 && r.height > 8 && r.top >= 0 && r.top < window.innerHeight;
        });
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

async function mouseClick(ws, x, y) {
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await wait(100);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function getButtonCoord(ws, label) {
  // Get actual coordinates of a visible button/element by querying all visible buttons
  const result = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const all = Array.from(document.querySelectorAll('button, [role="button"], [role="menuitem"]'));
        const visible = all.filter(e => {
          const r = e.getBoundingClientRect();
          return r.width > 8 && r.height > 8 && r.top > 0 && r.top < window.innerHeight;
        });
        return JSON.stringify(visible.map(e => {
          const r = e.getBoundingClientRect();
          return {
            aria: e.getAttribute('aria-label'),
            text: (e.innerText || '').trim().slice(0, 30),
            x: Math.round(r.left + r.width/2),
            y: Math.round(r.top + r.height/2)
          };
        }));
      })()
    `,
    returnByValue: true
  });
  if (result.result && result.result.value) {
    return JSON.parse(result.result.value);
  }
  return [];
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
  await cdpCall(ws, 'DOM.enable');

  // ═══ PASO 0: Nueva conversación ═══════════════════════
  console.log('\n🆕 PASO 0: Nueva conversación limpia...');
  await cdpCall(ws, 'Page.navigate', { url: 'https://gemini.google.com/u/1/app?hl=es' });
  await wait(3000);

  // ═══ PASO 1: Capa Manus ═══════════════════════════════
  console.log('\n📐 PASO 1: Capa Manus con badges...');
  const badgeCount = await injectManusLayer(ws);
  console.log(`   ${badgeCount} elementos badged`);
  await wait(500);

  // Obtener coordenadas de los botones visibles
  const buttons = await getButtonCoord(ws);
  console.log('\n   Botones detectados:');
  buttons.forEach(b => console.log(`   → aria="${b.aria}" | text="${b.text}" | (${b.x}, ${b.y})`));

  let ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('v3_step1_overlay.png', Buffer.from(ss.data, 'base64'));
  console.log('   📸 v3_step1_overlay.png');

  // Find the (+)/Subir button
  const plusBtn = buttons.find(b => {
    const aria = (b.aria || '').toLowerCase();
    const text = (b.text || '').toLowerCase();
    return aria.includes('subir') || aria.includes('attach') || aria.includes('upload') ||
           aria.includes('añadir') || text === '+' || aria.includes('companion') ||
           aria.includes('file') || text.includes('subir');
  });

  if (!plusBtn) {
    // Use fixed coordinate from screenshots: (+) button is at approximately (624, 372)
    console.log('\n   ⚠️ No se encontró botón (+) por aria, usando coordenada fija (624, 372)');
  }

  const plusX = plusBtn ? plusBtn.x : 624;
  const plusY = plusBtn ? plusBtn.y : 372;
  console.log(`\n   📍 Botón (+): (${plusX}, ${plusY})`);

  // ═══ PASO 2: Click (+) ════════════════════════════════
  console.log('\n📎 PASO 2: Click en (+) para abrir menú popup...');
  await mouseClick(ws, plusX, plusY);
  await wait(1500);

  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('v3_step2_menu.png', Buffer.from(ss.data, 'base64'));
  console.log('   📸 v3_step2_menu.png — menú debería estar visible');

  // ═══ PASO 3: Click "Subir archivos" ═══════════════════
  console.log('\n📁 PASO 3: Localizando y clickeando "Subir archivos"...');

  // Re-enumerate buttons after popup
  const menuButtons = await getButtonCoord(ws);
  const allElements = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        // Find all clickable/visible elements in popup
        const all = Array.from(document.querySelectorAll('button, li, [role="menuitem"], [role="option"], [role="listitem"]'));
        return JSON.stringify(all.filter(e => {
          const r = e.getBoundingClientRect();
          const t = (e.innerText || e.textContent || '').trim();
          return r.width > 0 && r.height > 0 && t.length > 2;
        }).map(e => {
          const r = e.getBoundingClientRect();
          return {
            tag: e.tagName,
            text: (e.innerText || e.textContent || '').trim().slice(0, 40),
            aria: e.getAttribute('aria-label'),
            x: Math.round(r.left + r.width/2),
            y: Math.round(r.top + r.height/2)
          };
        }));
      })()
    `,
    returnByValue: true
  });

  const allEls = JSON.parse((allElements.result && allElements.result.value) || '[]');
  const subirEl = allEls.find(e => {
    const t = (e.text || '').toLowerCase();
    const a = (e.aria || '').toLowerCase();
    return t === 'subir archivos' || t === 'upload files' || a.includes('subir archivo') ||
           t.includes('subir archivo') || t === 'upload file';
  });

  if (subirEl) {
    console.log(`   ✅ "Subir archivos" encontrado en (${subirEl.x}, ${subirEl.y})`);
    await mouseClick(ws, subirEl.x, subirEl.y);
  } else {
    console.log('   ⚠️ No se encontró "Subir archivos" por texto. Elementos visibles en popup:');
    allEls.slice(0, 20).forEach(e => console.log(`   → [${e.tag}] "${e.text}" (${e.x}, ${e.y})`));
    // Use fixed coordinate from previous inspection: "Subir archivos" is at ~(700, 401)
    console.log('   Usando coordenada fija (700, 401)...');
    await mouseClick(ws, 700, 401);
  }

  await wait(1500);

  // ═══ PASO 4: Inyectar 4 imágenes vía CDP ══════════════
  console.log('\n🖼️  PASO 4: Buscando input[type=file] y cargando 4 imágenes...');

  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const inputNode = await cdpCall(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });

  if (inputNode && inputNode.nodeId) {
    console.log(`   ✅ input[type=file] encontrado: nodeId=${inputNode.nodeId}`);
    await cdpCall(ws, 'DOM.setFileInputFiles', {
      nodeId: inputNode.nodeId,
      files: [logoPath, hookPath, corePath, climaxPath]
    });
    console.log('   ✅ Las 4 imágenes han sido inyectadas!');
    console.log('      Logo  :', logoPath);
    console.log('      Hook  :', hookPath);
    console.log('      Core  :', corePath);
    console.log('      Climax:', climaxPath);
  } else {
    // Search in all DOM nodes for file input
    const allInputs = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `JSON.stringify(Array.from(document.querySelectorAll('input')).map(i => ({ type: i.type, name: i.name, id: i.id })))`,
      returnByValue: true
    });
    console.log('   ⚠️ input[type=file] no encontrado. Inputs en DOM:', allInputs.result && allInputs.result.value);

    ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('v3_step4_no_input_debug.png', Buffer.from(ss.data, 'base64'));
    console.log('   📸 v3_step4_no_input_debug.png');
    ws.close();
    return;
  }

  // Esperar thumbnails
  await wait(4000);
  await injectManusLayer(ws);
  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('v3_step4_thumbnails.png', Buffer.from(ss.data, 'base64'));
  console.log('\n   📸 v3_step4_thumbnails.png — ¿MINIATURAS DE LAS 4 IMÁGENES?');

  // ═══ PASO 5: Escribir prompt ══════════════════════════
  console.log('\n✍️  PASO 5: Escribiendo prompt...');
  const promptText = "Animate these 4 uploaded promotional images (Official FairDraw Logo, 3D Winner Hook, 3D AI Referee Core, 3D Friends Celebration Climax) into a high-energy 10-second vertical 9:16 promotional video for FairDraw online sweepstakes app. Show smooth transitions between the transparent sweepstakes hook, 100% provably fair algorithm, and the final YOU WON winner celebration climax.";

  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const ed = document.querySelector('div[contenteditable="true"], textarea');
        if (ed) {
          ed.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, ${JSON.stringify(promptText)});
          ed.dispatchEvent(new Event('input', { bubbles: true }));
          return 'typed';
        }
        return 'no editor';
      })()
    `,
    returnByValue: true
  });

  await wait(1000);

  // ═══ PASO 6: Enviar ════════════════════════════════════
  console.log('\n🚀 PASO 6: Enviando el mensaje...');
  const sendResult = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const send = buttons.find(b => {
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          return aria === 'enviar mensaje' || aria === 'send message' || aria.includes('send');
        });
        if (send) { send.click(); return 'clicked: ' + send.getAttribute('aria-label'); }
        // Fallback: Enter key on editor
        const ed = document.querySelector('div[contenteditable="true"]');
        if (ed) {
          ed.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
          return 'enter sent';
        }
        return 'not found';
      })()
    `,
    returnByValue: true
  });
  console.log('   Resultado:', sendResult.result ? sendResult.result.value : 'unknown');

  await wait(6000);
  await injectManusLayer(ws);
  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('v3_step6_result.png', Buffer.from(ss.data, 'base64'));
  console.log('   📸 v3_step6_result.png — RESULTADO FINAL');

  console.log('\n=======================================================');
  console.log('🎉 FLUJO v3 COMPLETADO');
  console.log('   Capturas clave:');
  console.log('   - v3_step2_menu.png        (menú popup)');
  console.log('   - v3_step4_thumbnails.png  (miniaturas)');
  console.log('   - v3_step6_result.png      (generación)');
  console.log('=======================================================');
  ws.close();
}

main().catch(err => console.error('❌ Error:', err));
