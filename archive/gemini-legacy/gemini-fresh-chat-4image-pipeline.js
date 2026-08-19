const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// 4 Image Assets
const logoPath = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_official_logo_1784899306001.png';
const hookPath = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_3d_new_hook_1784899716687.png';
const corePath = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_3d_new_core_1784899732605.png';
const climaxPath = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\fairdraw_3d_new_climax_1784899748976.png';

console.log('=======================================================');
console.log('🎬 GEMINI WEB FRESH CHAT 4-IMAGE PIPELINE (WITH LAYERS)');
console.log('=======================================================');

function getChromeTabs() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function cdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 100000);
    const msg = JSON.stringify({ id, method, params });
    const handler = (data) => {
      try {
        const res = JSON.parse(data);
        if (res.id === id) {
          ws.removeListener('message', handler);
          if (res.error) reject(res.error);
          else resolve(res.result);
        }
      } catch(e){}
    };
    ws.on('message', handler);
    ws.send(msg);
  });
}

async function runFreshChatPipeline() {
  try {
    const tabs = await getChromeTabs();
    const geminiTab = tabs.find(t => t.type === 'page' && t.url && t.url.includes('gemini.google.com') && !t.url.includes('RotateCookiesPage'));
    if (!geminiTab) throw new Error('No se encontró la pestaña de Gemini Web');

    console.log(`📍 Tab Gemini Web: ${geminiTab.url}`);
    const ws = new WebSocket(geminiTab.webSocketDebuggerUrl);
    await new Promise(r => ws.on('open', r));

    await cdp(ws, 'Page.bringToFront');
    await cdp(ws, 'DOM.enable');

    // Step 1: Open a brand new chat
    console.log('1. Abriendo una NUEVA conversación limpia en Gemini Web...');
    await cdp(ws, 'Runtime.evaluate', { expression: `
      (function() {
        const btns = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
        const newChatBtn = btns.find(b => {
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          const text = (b.innerText || b.textContent || '').toLowerCase();
          return aria.includes('nueva conversación') || aria.includes('new chat') || text.includes('nueva conversación');
        });
        if (newChatBtn) {
          newChatBtn.focus();
          newChatBtn.click();
          return { newChatOpened: true };
        }
        return { newChatOpened: false };
      })()
    ` });

    await new Promise(r => setTimeout(r, 2000));

    // Step 2: Inject Hyperion Manus-style Visual Overlay
    console.log('2. Inyectando Capa Manus de Hyperion con recuadros de colores e indicador visual...');
    const overlayScript = `
      (function(){
        try {
          if (window.__HY_SINGLE_TIMER) clearInterval(window.__HY_SINGLE_TIMER);
          document.querySelectorAll('.hy-rr,.hy-st,.hy-el,.hy-tp').forEach(e => e.remove());
        } catch(e){}

        if(!document.querySelector('.hy-st')){
          var s = document.createElement('style');
          s.className = 'hy-st';
          s.textContent = '.hy-rr{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 11px/13px monospace;color:#fff;text-shadow:0 0 3px #000,0 0 6px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;backdrop-filter:saturate(130%);}';
          document.head.appendChild(s);
        }

        var C = [
          {f:'rgba(255,0,0,0.4)', b:'#F00'},
          {f:'rgba(0,200,0,0.4)', b:'#0C0'},
          {f:'rgba(0,100,255,0.4)', b:'#06F'},
          {f:'rgba(200,200,0,0.4)', b:'#CC0'},
          {f:'rgba(200,0,200,0.4)', b:'#C0C'},
          {f:'rgba(0,200,200,0.4)', b:'#0CC'}
        ];

        function getAllDeepElements(root = document) {
          let els = Array.from(root.querySelectorAll('button, a, input, textarea, select, [role="button"], [role="menuitem"], [role="option"], [contenteditable="true"]'));
          let allNodes = Array.from(root.querySelectorAll('*'));
          for (let i = 0; i < allNodes.length; i++) {
            if (allNodes[i].shadowRoot) {
              els = els.concat(getAllDeepElements(allNodes[i].shadowRoot));
            }
          }
          return els;
        }

        var all = getAllDeepElements(document);
        var vis = [];
        for (var i = 0; i < all.length; i++) {
          var el = all[i];
          if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
          var r = el.getBoundingClientRect();
          if (r.width < 10 || r.height < 10) continue;
          var text = (el.getAttribute('aria-label') || el.innerText || el.textContent || el.tagName).trim().slice(0, 15);
          vis.push({ el: el, rect: r, text: text });
        }

        var info = document.createElement('div');
        info.className = 'hy-rr';
        info.style.cssText = 'top:3px;left:50%;transform:translateX(-50%);padding:4px 12px;background:rgba(0,0,0,0.9);border-radius:4px;font:bold 12px monospace;color:#0f0;border:1px solid #0f0;z-index:2147483647;pointer-events:none;';
        info.textContent = 'CAPA ACTIVA: GEMINI WEB [' + vis.length + ' ELEMENTOS BADGED]';
        document.body.appendChild(info);

        for (var j = 0; j < vis.length; j++) {
          var item = vis[j], rect = item.rect, color = C[j % C.length];
          var b = document.createElement('div');
          b.className = 'hy-rr';
          b.style.cssText = 'left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;background:' + color.f + ';border:2px solid ' + color.b + ';';
          b.textContent = '[' + (j + 1) + '] ' + item.text;
          document.body.appendChild(b);
          item.el.setAttribute('data-hy-num', (j + 1).toString());
        }

        return vis.length;
      })()
    `;

    await cdp(ws, 'Runtime.evaluate', { expression: overlayScript });

    await new Promise(r => setTimeout(r, 1000));
    let ss = await cdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('gemini_fresh_chat_overlay.png', Buffer.from(ss.data, 'base64'));
    console.log('📸 Captura (Nueva conversación con Capa Manus): gemini_fresh_chat_overlay.png');

    // Step 3: Click (+) button
    console.log('3. Clickeando el botón (+) de Subir archivos...');
    await cdp(ws, 'Runtime.evaluate', { expression: `
      (function() {
        function getAllDeepElements(root = document) {
          let els = Array.from(root.querySelectorAll('*'));
          for (let el of Array.from(root.querySelectorAll('*'))) {
            if (el.shadowRoot) els = els.concat(getAllDeepElements(el.shadowRoot));
          }
          return els;
        }
        const all = getAllDeepElements(document);
        const plusBtn = all.find(e => {
          const aria = (e.getAttribute('aria-label') || '').toLowerCase();
          const title = (e.getAttribute('title') || '').toLowerCase();
          return (aria.includes('subir') || aria.includes('upload') || aria.includes('añadir') || title.includes('subir')) && e.offsetWidth > 0;
        });
        if (plusBtn) {
          plusBtn.focus();
          plusBtn.click();
          return { plusClicked: true };
        }
        return { plusClicked: false };
      })()
    ` });

    await new Promise(r => setTimeout(r, 1500));

    // Step 4: Inject 4 image assets via CDP setFileInputFiles
    console.log('4. Inyectando los 4 archivos de imagen (Logo + 3 Storyboards 3D)...');
    const doc = await cdp(ws, 'DOM.getDocument', { depth: -1, pierce: true });
    const queryRes = await cdp(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });

    if (queryRes && queryRes.nodeId) {
      await cdp(ws, 'DOM.setFileInputFiles', {
        files: [logoPath, hookPath, corePath, climaxPath],
        nodeId: queryRes.nodeId
      });
      console.log('✅ 4 Archivos de imagen inyectados correctamente vía CDP.');
    }

    // Step 5: Wait 4 seconds for image thumbnails to render in the prompt container
    await new Promise(r => setTimeout(r, 4000));
    await cdp(ws, 'Runtime.evaluate', { expression: overlayScript });

    ss = await cdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('gemini_fresh_chat_4images_attached.png', Buffer.from(ss.data, 'base64'));
    console.log('📸 Captura Hito (VERIFICACIÓN DE 4 MINIATURAS ADJUNTAS): gemini_fresh_chat_4images_attached.png');

    ws.close();
  } catch(err) {
    console.error('❌ Error en el pipeline de chat limpio:', err);
  }
}

runFreshChatPipeline();
