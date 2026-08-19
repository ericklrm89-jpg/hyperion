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
console.log('🎬 HYPERION GEMINI WEB VIDEO CREATOR (PROGRAMMATIC DOM)');
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

async function runGeminiProgrammaticFlow() {
  try {
    const tabs = await getChromeTabs();
    const geminiTab = tabs.find(t => t.type === 'page' && t.url && t.url.includes('gemini.google.com') && !t.url.includes('RotateCookiesPage'));
    if (!geminiTab) throw new Error('No se encontró la pestaña de Gemini Web');

    console.log(`📍 Pestaña activa Gemini Web: ${geminiTab.url}`);
    const ws = new WebSocket(geminiTab.webSocketDebuggerUrl);
    await new Promise(r => ws.on('open', r));

    await cdp(ws, 'Page.bringToFront');
    await cdp(ws, 'DOM.enable');

    // 1. INYECTAR OVERLAY VISUAL OBLIGATORIO DE HYPERION Y MAPPER PROGRAMÁTICO
    console.log('1. Inyectando Overlay Visual Obligatorio y Mapper Programático de Hyperion...');
    await cdp(ws, 'Runtime.evaluate', { expression: `
      (function(){
        // Inyectar Estilos e Indicadores de Capa
        if(!document.querySelector('.hy-st')){
          var s = document.createElement('style');
          s.className = 'hy-st';
          s.textContent = '.hy-rr{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 11px/13px monospace;color:#fff;text-shadow:0 0 3px #000,0 0 6px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;backdrop-filter:saturate(130%);}';
          document.head.appendChild(s);
        }

        function getAllDeepElements(root = document) {
          let els = Array.from(root.querySelectorAll('*'));
          for (let el of Array.from(root.querySelectorAll('*'))) {
            if (el.shadowRoot) els = els.concat(getAllDeepElements(el.shadowRoot));
          }
          return els;
        }

        window.__HY_GEMINI = {
          getUploadPlusButton: function() {
            const all = getAllDeepElements(document);
            return all.find(e => {
              const aria = (e.getAttribute('aria-label') || '').toLowerCase();
              const title = (e.getAttribute('title') || '').toLowerCase();
              return (aria.includes('subir') || aria.includes('upload') || aria.includes('añadir') || aria.includes('add') || title.includes('subir')) && e.offsetWidth > 0;
            });
          },
          getPromptEditor: function() {
            const all = getAllDeepElements(document);
            return all.find(e => e.getAttribute && e.getAttribute('contenteditable') === 'true' && e.offsetWidth > 0);
          },
          getSendButton: function() {
            const all = getAllDeepElements(document);
            return all.find(e => {
              const aria = (e.getAttribute('aria-label') || '').toLowerCase();
              return (aria === 'enviar mensaje' || aria === 'enviar' || aria === 'send message' || aria === 'send') && e.offsetWidth > 0;
            });
          },
          getFileInput: function() {
            const all = getAllDeepElements(document);
            return all.find(e => e.tagName === 'INPUT' && e.type === 'file');
          },
          getVideoDownloadButton: function() {
            const all = getAllDeepElements(document);
            return all.find(e => {
              const aria = (e.getAttribute('aria-label') || '').toLowerCase();
              const text = (e.innerText || e.textContent || '').toLowerCase();
              return (aria.includes('descargar') || aria.includes('download') || text.includes('descargar vídeo') || text.includes('download video')) && e.offsetWidth > 0;
            });
          }
        };

        // Renderizar Banner de Capa Visual
        document.querySelectorAll('.hy-hdr').forEach(e => e.remove());
        var info = document.createElement('div');
        info.className = 'hy-rr hy-hdr';
        info.style.cssText = 'top:3px;left:50%;transform:translateX(-50%);padding:3px 10px;background:rgba(0,0,0,0.85);border-radius:4px;font:bold 12px monospace;color:#0f0;border:1px solid #0f0;z-index:2147483647;pointer-events:none;';
        info.textContent = 'CAPA ACTIVA: GEMINI WEB [MAPEO PROGRAMÁTICO v6]';
        document.body.appendChild(info);

        return {
          plus: !!window.__HY_GEMINI.getUploadPlusButton(),
          editor: !!window.__HY_GEMINI.getPromptEditor(),
          send: !!window.__HY_GEMINI.getSendButton()
        };
      })()
    ` });

    await new Promise(r => setTimeout(r, 1000));
    let ss = await cdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('gemini_step1_overlay.png', Buffer.from(ss.data, 'base64'));
    console.log('📸 Captura Hito 1 (Capa & Overlay): gemini_step1_overlay.png');

    // 2. CLICKEAR BOTÓN (+) DE SUBIR ARCHIVOS MEDIANTE CÓDIGO
    console.log('2. Clickeando el botón (+) de Subir mediante código programático...');
    await cdp(ws, 'Runtime.evaluate', { expression: `
      (function() {
        const btn = window.__HY_GEMINI ? window.__HY_GEMINI.getUploadPlusButton() : null;
        if (btn) { btn.focus(); btn.click(); return true; }
        return false;
      })()
    ` });

    await new Promise(r => setTimeout(r, 1500));

    // 3. INYECTAR LAS 4 IMÁGENES EN UNA SOLA PASADA VÍA CDP
    console.log('3. Inyectando las 4 imágenes (Logo + 3 Storyboards 3D) en una sola pasada...');
    const doc = await cdp(ws, 'DOM.getDocument', { depth: -1, pierce: true });
    const queryRes = await cdp(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
    
    if (queryRes && queryRes.nodeId) {
      await cdp(ws, 'DOM.setFileInputFiles', {
        files: [logoPath, hookPath, corePath, climaxPath],
        nodeId: queryRes.nodeId
      });
      console.log('✅ Las 4 imágenes fueron inyectadas correctamente.');
    }

    await new Promise(r => setTimeout(r, 3000));
    ss = await cdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('gemini_step2_4images.png', Buffer.from(ss.data, 'base64'));
    console.log('📸 Captura Hito 2 (4 Imágenes Cargadas): gemini_step2_4images.png');

    // 4. ESCRIBIR EL PROMPT MAPEADO POR CÓDIGO
    console.log('4. Escribiendo el prompt de animación mapeado por código...');
    const promptText = "Animate these 4 uploaded promotional images (Official FairDraw Logo, 3D Winner Hook, 3D AI Referee Core, 3D Friends Celebration Climax) into a high-energy 10-second vertical 9:16 promotional video for FairDraw online sweepstakes app. Show smooth transitions between the transparent sweepstakes hook, 100% provably fair algorithm, and the final YOU WON winner celebration climax.";

    await cdp(ws, 'Runtime.evaluate', { expression: `
      (function() {
        const editor = window.__HY_GEMINI ? window.__HY_GEMINI.getPromptEditor() : null;
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

    // 5. CLICKEAR EL BOTÓN ENVIAR MENSAJE MAPEADO POR CÓDIGO
    console.log('5. Clickeando el botón [Enviar mensaje] mapeado por código...');
    await cdp(ws, 'Runtime.evaluate', { expression: `
      (function() {
        const btn = window.__HY_GEMINI ? window.__HY_GEMINI.getSendButton() : null;
        if (btn) {
          btn.focus();
          btn.click();
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return true;
        }
        return false;
      })()
    ` });

    await new Promise(r => setTimeout(r, 4000));
    ss = await cdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('gemini_step3_sent.png', Buffer.from(ss.data, 'base64'));
    console.log('📸 Captura Hito 3 (Prompt Enviado a Gemini): gemini_step3_sent.png');

    console.log('=======================================================');
    console.log('🎉 FLUJO MAPEADO POR CÓDIGO Y CAPAS EJECUTADO CON ÉXITO.');
    console.log('=======================================================');
    ws.close();
  } catch(err) {
    console.error('❌ Error en ejecución de Gemini Web:', err);
  }
}

runGeminiProgrammaticFlow();
