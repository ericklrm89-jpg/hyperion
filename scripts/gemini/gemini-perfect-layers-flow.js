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
console.log('🛡️ HYPERION PERFECT LAYER FLOW FOR GEMINI WEB (v6)');
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

async function runPerfectLayersFlow() {
  try {
    const tabs = await getChromeTabs();
    const geminiTab = tabs.find(t => t.type === 'page' && t.url && t.url.includes('gemini.google.com') && !t.url.includes('RotateCookiesPage'));
    if (!geminiTab) throw new Error('No se encontró la pestaña activa de Gemini Web');

    console.log(`📍 Pestaña activa Gemini Web: ${geminiTab.url}`);
    const ws = new WebSocket(geminiTab.webSocketDebuggerUrl);
    await new Promise(r => ws.on('open', r));

    await cdp(ws, 'Page.bringToFront');
    await cdp(ws, 'DOM.enable');

    // -------------------------------------------------------------
    // PASO 1: INYECTAR OVERLAY VISUAL DE HYPERION Y DIBUJAR BADGES [1..N]
    // -------------------------------------------------------------
    console.log('1. Inyectando Hyperion Visual Overlay y mapeando badges [1..N]...');
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

        // Header de Capa
        var info = document.createElement('div');
        info.className = 'hy-rr';
        info.style.cssText = 'top:3px;left:50%;transform:translateX(-50%);padding:4px 12px;background:rgba(0,0,0,0.9);border-radius:4px;font:bold 12px monospace;color:#0f0;border:1px solid #0f0;z-index:2147483647;pointer-events:none;';
        info.textContent = 'CAPA ACTIVA: GEMINI WEB [' + vis.length + ' ELEMENTOS BADGED]';
        document.body.appendChild(info);

        // Draw badges
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

    const elementCount = await cdp(ws, 'Runtime.evaluate', { expression: overlayScript });
    console.log(`Badges visuales renderizados en pantalla: ${elementCount.result.value}`);

    await new Promise(r => setTimeout(r, 1000));
    let ss = await cdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('gemini_layer_step1_initial.png', Buffer.from(ss.data, 'base64'));
    console.log('📸 Captura Hito 1 (Badges e Indicador de Capa): gemini_layer_step1_initial.png');

    // -------------------------------------------------------------
    // PASO 2: CLICKEAR EL BOTÓN (+) DE SUBIR ARCHIVOS
    // -------------------------------------------------------------
    console.log('2. Buscando y clickeando el botón (+) de Subir...');
    const clickPlusRes = await cdp(ws, 'Runtime.evaluate', { expression: `
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
          return (aria.includes('subir') || aria.includes('upload') || aria.includes('añadir') || aria.includes('add') || title.includes('subir')) && e.offsetWidth > 0;
        });
        if (plusBtn) {
          plusBtn.focus();
          plusBtn.click();
          return { found: true, aria: plusBtn.getAttribute('aria-label') };
        }
        return { found: false };
      })()
    ` });

    console.log('Resultado del clic (+):', clickPlusRes.result.value);

    // Re-inyectar overlay para capturar el menú desplegado
    await new Promise(r => setTimeout(r, 1500));
    await cdp(ws, 'Runtime.evaluate', { expression: overlayScript });

    ss = await cdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('gemini_layer_step2_menu_opened.png', Buffer.from(ss.data, 'base64'));
    console.log('📸 Captura Hito 2 (Menú (+) Desplegado con Badges): gemini_layer_step2_menu_opened.png');

    // -------------------------------------------------------------
    // PASO 3: CLICKEAR "SUBIR ARCHIVOS" E INYECTAR LAS 4 IMÁGENES
    // -------------------------------------------------------------
    console.log('3. Clickeando la opción "Subir archivos" del menú emergente e inyectando las 4 imágenes...');
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
        const uploadOption = all.find(e => {
          const text = (e.innerText || e.textContent || e.getAttribute('aria-label') || '').toLowerCase();
          return (text.includes('subir archivos') || text.includes('subir desde') || text.includes('upload files') || text.includes('drive')) && e.offsetWidth > 0;
        });
        if (uploadOption) {
          uploadOption.focus();
          uploadOption.click();
          return { clickedOption: true, text: uploadOption.innerText };
        }
        return { clickedOption: false };
      })()
    ` });

    await new Promise(r => setTimeout(r, 1000));

    // Inyectar 4 imágenes vía CDP setFileInputFiles
    const doc = await cdp(ws, 'DOM.getDocument', { depth: -1, pierce: true });
    const queryRes = await cdp(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
    if (queryRes && queryRes.nodeId) {
      await cdp(ws, 'DOM.setFileInputFiles', {
        files: [logoPath, hookPath, corePath, climaxPath],
        nodeId: queryRes.nodeId
      });
      console.log('✅ 4 Archivos de imagen (Logo + 3 Storyboards 3D) inyectados exitosamente vía CDP.');
    }

    // Esperar 4 segundos para renderizado de las miniaturas en la caja de texto
    await new Promise(r => setTimeout(r, 4000));
    await cdp(ws, 'Runtime.evaluate', { expression: overlayScript });

    ss = await cdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('gemini_layer_step3_thumbnails_attached.png', Buffer.from(ss.data, 'base64'));
    console.log('📸 Captura Hito 3 (VERIFICACIÓN DE MINIATURAS ADJUNTAS): gemini_layer_step3_thumbnails_attached.png');

    // -------------------------------------------------------------
    // PASO 4: ESCRIBIR EL PROMPT Y CLICKEAR ENVIAR
    // -------------------------------------------------------------
    console.log('4. Escribiendo el prompt de animación de video en inglés...');
    const promptText = "Animate these 4 uploaded promotional images (Official FairDraw Logo, 3D Winner Hook, 3D AI Referee Core, 3D Friends Celebration Climax) into a high-energy 10-second vertical 9:16 promotional video for FairDraw online sweepstakes app. Show smooth transitions between the transparent sweepstakes hook, 100% provably fair algorithm, and the final YOU WON winner celebration climax.";

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
        const editor = all.find(e => e.getAttribute && e.getAttribute('contenteditable') === 'true');
        if (editor) {
          editor.focus();
          editor.textContent = ${JSON.stringify(promptText)};
          editor.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      })()
    ` });

    await new Promise(r => setTimeout(r, 1500));

    console.log('5. Clickeando el botón [Enviar mensaje] atravesando Shadow DOM...');
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
        const sendBtn = all.find(e => {
          const aria = (e.getAttribute('aria-label') || '').toLowerCase();
          return (aria === 'enviar mensaje' || aria === 'enviar' || aria === 'send message' || aria === 'send') && e.offsetWidth > 0;
        });
        if (sendBtn) {
          sendBtn.focus();
          sendBtn.click();
          sendBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return { sent: true };
        }
        return { sent: false };
      })()
    ` });

    await new Promise(r => setTimeout(r, 4000));
    await cdp(ws, 'Runtime.evaluate', { expression: overlayScript });

    ss = await cdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('gemini_layer_step4_prompt_submitted.png', Buffer.from(ss.data, 'base64'));
    console.log('📸 Captura Hito 4 (Prompt Enviado con Imágenes): gemini_layer_step4_prompt_submitted.png');

    console.log('=======================================================');
    console.log('🎉 FLUJO PERFECTO DE CAPAS Y CARGA DE IMÁGENES FINALIZADO.');
    console.log('=======================================================');
    ws.close();
  } catch(err) {
    console.error('❌ Error en el flujo perfecto de capas:', err);
  }
}

runPerfectLayersFlow();
