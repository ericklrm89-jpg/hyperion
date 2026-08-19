const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

// 4 Image Assets
const logoPath = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_official_logo_1784899306001.png';
const hookPath = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_3d_new_hook_1784899716687.png';
const corePath = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_3d_new_core_1784899732605.png';
const climaxPath = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_3d_new_climax_1784899748976.png';

console.log('=======================================================');
console.log('🎬 GEMINI: Nueva Conv → Capa → (+) → "Subir archivos" → 4 imgs → Prompt → Enviar');
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
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
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
  await cdpCall(ws, 'DOM.enable');

  // ═══════════════════════════════════════════════════════
  // PASO 0: Navegar a Nueva Conversación
  // ═══════════════════════════════════════════════════════
  console.log('\n🆕 PASO 0: Navegando a nueva conversación limpia...');
  await cdpCall(ws, 'Page.navigate', { url: 'https://gemini.google.com/u/1/app?hl=es' });
  await wait(3000);

  let ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('v2_step0_new_conv.png', Buffer.from(ss.data, 'base64'));
  console.log('   📸 v2_step0_new_conv.png — Pantalla de nueva conversación');

  // ═══════════════════════════════════════════════════════
  // PASO 1: Capa Manus en pantalla limpia
  // ═══════════════════════════════════════════════════════
  console.log('\n📐 PASO 1: Capa Manus con badges...');
  await injectManusLayer(ws);
  await wait(500);
  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('v2_step1_overlay.png', Buffer.from(ss.data, 'base64'));
  console.log('   📸 v2_step1_overlay.png — badges sobre pantalla limpia');

  // ═══════════════════════════════════════════════════════
  // PASO 2: Click (+) para abrir el menú popup
  // En pantalla limpia, el (+) está en la barra inferior izquierda
  // Coordenadas del screenshot anterior: badge [241] Subi estaba en ~(610, 502) en esa vista
  // En pantalla limpia (sin historial de chat) debería estar centrado
  // ═══════════════════════════════════════════════════════
  console.log('\n📎 PASO 2: Click en (+) para abrir menú popup...');

  // Find the (+) button via JS since position may differ
  const plusPos = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const plusBtn = buttons.find(b => {
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          return aria.includes('subir') || aria.includes('upload') || aria.includes('añadir') || aria.includes('add') || aria.includes('plus') || aria.includes('attach');
        });
        if (plusBtn) {
          const r = plusBtn.getBoundingClientRect();
          return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), aria: plusBtn.getAttribute('aria-label') });
        }
        // Fallback: find any button with a "+" icon (mat-icon with add)
        const allBtns = Array.from(document.querySelectorAll('button'));
        const addBtn = allBtns.find(b => b.querySelector('mat-icon') && b.innerText.trim() === '');
        if (addBtn) {
          const r = addBtn.getBoundingClientRect();
          return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), aria: addBtn.getAttribute('aria-label') });
        }
        return null;
      })()
    `,
    returnByValue: true
  });

  let plusX = 616, plusY = 502;
  if (plusPos.result && plusPos.result.value) {
    const pos = JSON.parse(plusPos.result.value);
    plusX = pos.x;
    plusY = pos.y;
    console.log(`   ✅ Botón (+) encontrado: aria="${pos.aria}" en (${plusX}, ${plusY})`);
  } else {
    console.log(`   ⚠️ No se encontró (+) via JS, usando fallback (${plusX}, ${plusY})`);
  }

  await mouseClick(ws, plusX, plusY);
  await wait(1500);

  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('v2_step2_menu_open.png', Buffer.from(ss.data, 'base64'));
  console.log('   📸 v2_step2_menu_open.png — menú popup abierto');

  // ═══════════════════════════════════════════════════════
  // PASO 3: Click en "Subir archivos" en el menú popup
  // Buscarlo por texto para mayor precisión
  // ═══════════════════════════════════════════════════════
  console.log('\n📁 PASO 3: Click en "Subir archivos" del menú...');

  const menuItemPos = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        // Search all elements for "Subir archivos" text
        const all = Array.from(document.querySelectorAll('*'));
        const item = all.find(e => {
          const t = (e.innerText || e.textContent || '').trim();
          return (t === 'Subir archivos' || t === 'Upload files' || t === 'Upload file') && e.getBoundingClientRect().width > 0;
        });
        if (item) {
          const r = item.getBoundingClientRect();
          return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
        }
        return null;
      })()
    `,
    returnByValue: true
  });

  let menuX = 700, menuY = 401;
  if (menuItemPos.result && menuItemPos.result.value) {
    const pos = JSON.parse(menuItemPos.result.value);
    menuX = pos.x;
    menuY = pos.y;
    console.log(`   ✅ "Subir archivos" encontrado en (${menuX}, ${menuY})`);
  } else {
    console.log(`   ⚠️ No se encontró "Subir archivos" via JS, usando fallback (${menuX}, ${menuY})`);
  }

  await mouseClick(ws, menuX, menuY);
  await wait(1500);

  // ═══════════════════════════════════════════════════════
  // PASO 4: Inyectar las 4 imágenes vía CDP
  // ═══════════════════════════════════════════════════════
  console.log('\n🖼️  PASO 4: Buscando input[type=file] y inyectando 4 imágenes...');
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const inputNode = await cdpCall(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });

  if (inputNode && inputNode.nodeId) {
    console.log(`   ✅ input[type=file] encontrado: nodeId=${inputNode.nodeId}`);
    await cdpCall(ws, 'DOM.setFileInputFiles', {
      nodeId: inputNode.nodeId,
      files: [logoPath, hookPath, corePath, climaxPath]
    });
    console.log('   ✅ 4 imágenes inyectadas vía DOM.setFileInputFiles!');
  } else {
    console.log('   ❌ input[type=file] no encontrado');
    ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('v2_step4_no_input.png', Buffer.from(ss.data, 'base64'));
    console.log('   📸 v2_step4_no_input.png — investigar');
    ws.close();
    return;
  }

  // Esperar miniaturas
  await wait(4000);
  await injectManusLayer(ws);
  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('v2_step4_thumbnails.png', Buffer.from(ss.data, 'base64'));
  console.log('   📸 v2_step4_thumbnails.png — ¿MINIATURAS DE 4 IMÁGENES VISIBLES?');

  // ═══════════════════════════════════════════════════════
  // PASO 5: Escribir el prompt
  // ═══════════════════════════════════════════════════════
  console.log('\n✍️  PASO 5: Escribiendo el prompt...');
  const promptText = "Animate these 4 uploaded promotional images (Official FairDraw Logo, 3D Winner Hook, 3D AI Referee Core, 3D Friends Celebration Climax) into a high-energy 10-second vertical 9:16 promotional video for FairDraw online sweepstakes app. Show smooth transitions between the transparent sweepstakes hook, 100% provably fair algorithm, and the final YOU WON winner celebration climax.";

  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const ed = document.querySelector('div[contenteditable="true"], textarea, [aria-label="Pregunta a Gemini"]');
        if (ed) {
          ed.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, ${JSON.stringify(promptText)});
          ed.dispatchEvent(new Event('input', { bubbles: true }));
          return 'typed';
        }
        return 'no editor found';
      })()
    `,
    returnByValue: true
  });

  await wait(1000);
  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('v2_step5_prompt_ready.png', Buffer.from(ss.data, 'base64'));
  console.log('   📸 v2_step5_prompt_ready.png — prompt listo + miniaturas');

  // ═══════════════════════════════════════════════════════
  // PASO 6: Enviar mensaje
  // ═══════════════════════════════════════════════════════
  console.log('\n🚀 PASO 6: Enviando el mensaje...');

  const sendResult = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const send = buttons.find(b => {
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          return aria === 'enviar mensaje' || aria === 'send message' || aria === 'send' || aria === 'enviar';
        });
        if (send) { send.click(); return 'clicked: ' + send.getAttribute('aria-label'); }
        // Fallback: try keyboard Enter in the editor
        const ed = document.querySelector('div[contenteditable="true"]');
        if (ed) {
          ed.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
          return 'enter dispatched';
        }
        return 'not found';
      })()
    `,
    returnByValue: true
  });

  console.log('   Resultado del envío:', sendResult.result ? sendResult.result.value : 'unknown');

  await wait(6000);
  await injectManusLayer(ws);
  ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('v2_step6_generating.png', Buffer.from(ss.data, 'base64'));
  console.log('   📸 v2_step6_generating.png — GENERACIÓN EN PROGRESO');

  console.log('\n=======================================================');
  console.log('🎉 FLUJO COMPLETADO - Capturas de verificación:');
  console.log('   v2_step0_new_conv.png');
  console.log('   v2_step1_overlay.png');
  console.log('   v2_step2_menu_open.png');
  console.log('   v2_step4_thumbnails.png  ← CLAVE');
  console.log('   v2_step5_prompt_ready.png ← CLAVE');
  console.log('   v2_step6_generating.png   ← RESULTADO');
  console.log('=======================================================');

  ws.close();
}

main().catch(err => console.error('❌ Error:', err));
