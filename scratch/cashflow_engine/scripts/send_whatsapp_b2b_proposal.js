const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CDP_PORT = 9001;
const ASSETS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets';
const FLYER = path.join(ASSETS_DIR, 'nanoai_b2b_square_hd_flyer.jpg');

const WA_MESSAGE = `⚡ *NanoAI Industrial OS — Automatización de Costos & Mermas*

¿Cuánto le cuesta al mes depender de personal para cotizar y calcular despiece de materiales?

📉 *Comparativa Operativa:*
❌ *3 Cotizadores Manuales:* -$3,600 USD/mes | 48h de espera | 8-15% merma
✅ *NanoAI On-Premise:* $0 nómina | < 45 seg en vivo | < 2% merma
💰 *Recuperación Neta en Caja:* *+$4,200 USD / mes*

🎁 *Oferta Hormozi de Lanzamiento (Quito):*
Incluye *3 MESES GRATIS DE SOPORTE TÉCNICO* + *Visita Técnica Presencial de 20 minutos* en su planta por nuestro Director Técnico, Erick.

📅 ¿Coordinamos la visita técnica para este jueves o viernes?
🌐 https://nanoai.ec`;

const CAPA_MANUS_MULTICOLOR = `
(function(){
  try {
    if (window.__HY_SINGLE_TIMER) { clearInterval(window.__HY_SINGLE_TIMER); window.__HY_SINGLE_TIMER = null; }
    document.querySelectorAll('.hy-el, .hy-st, .hy-rr').forEach(function(e){ e.remove(); });
  } catch(e){}

  if(!document.querySelector('.hy-st')){
    var s = document.createElement('style');
    s.className = 'hy-st';
    s.textContent = '.hy-rr{position:fixed;pointer-events:none;z-index:2147483647;box-sizing:border-box;border:2px solid;border-radius:3px;overflow:hidden;}' +
                    '.hy-badge{position:absolute;top:0;left:0;font:bold 11px/13px monospace;padding:1px 4px;border-bottom-right-radius:3px;text-shadow:0 0 2px #000;}';
    document.head.appendChild(s);
  }

  var PALETTE = [
    { fill: 'rgba(239, 68, 68, 0.18)',  border: '#ef4444', badge: '#ef4444', text: '#ffffff' },
    { fill: 'rgba(34, 197, 94, 0.18)',  border: '#22c55e', badge: '#22c55e', text: '#000000' },
    { fill: 'rgba(59, 130, 246, 0.18)', border: '#3b82f6', badge: '#3b82f6', text: '#ffffff' },
    { fill: 'rgba(234, 179, 8, 0.18)',  border: '#eab308', badge: '#eab308', text: '#000000' },
    { fill: 'rgba(168, 85, 247, 0.18)', border: '#a855f7', badge: '#a855f7', text: '#ffffff' },
    { fill: 'rgba(236, 72, 153, 0.18)', border: '#ec4899', badge: '#ec4899', text: '#ffffff' }
  ];

  function getAllDeepElements(root) {
    root = root || document;
    var selector = 'button, a, input, textarea, select, [role="button"], [role="menuitem"], [role="tab"], [role="link"], [role="switch"], [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
    var els = Array.from(root.querySelectorAll(selector));
    var allNodes = Array.from(root.querySelectorAll('*'));
    for (var i = 0; i < allNodes.length; i++) {
      if (allNodes[i].shadowRoot) { els = els.concat(getAllDeepElements(allNodes[i].shadowRoot)); }
    }
    return els;
  }

  function getActiveLayerData(){
    var w = window.innerWidth, h = window.innerHeight;
    var all = getAllDeepElements(document);
    var vis = [];
    for (var i = 0; i < all.length; i++){
      try {
        var el = all[i];
        if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
        var r = el.getBoundingClientRect();
        if (r.width < 12 || r.height < 12) continue;
        if (r.right < 0 || r.bottom < 0 || r.left > w || r.top > h) continue;
        var cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
        if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
        var at = document.elementsFromPoint(cx, cy);
        if (!at || at.length === 0) continue;
        var top = at[0], onTop = (top === el || el.contains(top));
        if (!onTop) continue;
        var aria2 = el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder') || '';
        var rawText = aria2 || el.textContent || '';
        var text = rawText.replace(/[\\u200b-\\u200f\\ufeff\\u00ad]/g, '').replace(/\\s+/g, ' ').trim().slice(0, 16);
        if (!text) continue;
        vis.push({ el: el, rect: r, text: text });
      } catch(e){}
    }
    return { type: 'CAPA MANUS WHATSAPP', elements: vis };
  }

  function render(){
    try {
      document.querySelectorAll('.hy-rr').forEach(function(e){ e.remove(); });
      var layer = getActiveLayerData();
      var els = layer.elements || [];
      
      var banner = document.createElement('div');
      banner.className = 'hy-rr';
      banner.style.cssText = 'top:4px;left:50%;transform:translateX(-50%);padding:5px 18px;background:rgba(15,23,42,0.95);border:2px solid #22c55e;border-radius:20px;font:bold 12px monospace;color:#22c55e;white-space:nowrap;box-shadow:0 6px 16px rgba(0,0,0,0.8);';
      banner.textContent = '⚡ CAPA ACTIVA: ' + layer.type + ' [' + els.length + ' ELEMENTOS]';
      document.body.appendChild(banner);

      for (var i = 0; i < els.length; i++){
        var e = els[i], r = e.rect;
        var c = PALETTE[i % PALETTE.length];
        
        var box = document.createElement('div');
        box.className = 'hy-rr';
        box.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;background:' + c.fill + ';border-color:' + c.border + ';';
        
        var badge = document.createElement('div');
        badge.className = 'hy-badge';
        badge.style.cssText = 'background:' + c.badge + ';color:' + c.text + ';';
        badge.textContent = '[' + (i + 1) + '] ' + e.text;
        box.appendChild(badge);
        document.body.appendChild(box);
      }
    } catch(e){}
  }

  render();
  window.__HY_SINGLE_TIMER = setInterval(render, 250);
})();
`;

function getTabs() {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${CDP_PORT}/json`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function run() {
  const tabs = await getTabs();
  const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!waTab) return console.log('❌ No WA tab');

  const ws = new WebSocket(waTab.webSocketDebuggerUrl);

  ws.on('open', async () => {
    const call = (method, params = {}) => new Promise((resolve) => {
      const id = Math.floor(Math.random() * 99999);
      const h = (d) => {
        const j = JSON.parse(d);
        if (j.id === id) {
          ws.removeListener('message', h);
          resolve(j);
        }
      };
      ws.on('message', h);
      ws.send(JSON.stringify({ id, method, params }));
    });

    await call('DOM.enable');

    console.log('1. Abriendo chat personal de pruebas...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const chats = Array.from(document.querySelectorAll('div[role="listitem"]'));
        const tuChat = chats.find(c => c.innerText && (c.innerText.includes('Tú') || c.innerText.includes('You')));
        if (tuChat) {
          tuChat.click();
          return 'CLICKED_TU';
        }
        if (chats.length > 0) {
          chats[0].click();
          return 'CLICKED_FIRST_CHAT';
        }
        return 'NO_CHAT';
      })()`,
      returnByValue: true
    });
    await new Promise(r => setTimeout(r, 1500));

    console.log('2. Inyectando imagen HD como archivo multimedia...');
    if (fs.existsSync(FLYER)) {
      const doc = await call('DOM.getDocument', { depth: -1, pierce: true });
      const fileInputs = await call('DOM.querySelectorAll', { nodeId: doc.result.root.nodeId, selector: 'input[type="file"]' });
      const nodeIds = fileInputs.result?.nodeIds || [];
      if (nodeIds.length > 0) {
        const desc = await call('DOM.describeNode', { nodeId: nodeIds[nodeIds.length - 1] });
        if (desc.result?.node?.backendNodeId) {
          await call('DOM.setFileInputFiles', { backendNodeId: desc.result.node.backendNodeId, files: [FLYER] });
          console.log('✅ Archivo multimedia inyectado.');
          await new Promise(r => setTimeout(r, 3500));
        }
      }
    }

    console.log('3. Inyectando texto con psicología de neuroventas en el pie de foto...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const captionBox = document.querySelector('div[aria-label="Añade un pie de página"]') || 
                           document.querySelector('div[aria-placeholder="Añade un pie de página"]') ||
                           document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
                           document.querySelector('div[contenteditable="true"][data-tab="6"]');
        if (captionBox) {
          captionBox.focus();
          document.execCommand('insertText', false, ${JSON.stringify(WA_MESSAGE)});
          captionBox.dispatchEvent(new Event('input', { bubbles: true }));
          return 'CAPTION_INSERTED';
        }
        return 'NO_CAPTION_BOX';
      })()`,
      returnByValue: true
    });
    await new Promise(r => setTimeout(r, 1200));

    console.log('4. Inyectando Capa Manus Multicolor en WhatsApp...');
    await call('Runtime.evaluate', { expression: CAPA_MANUS_MULTICOLOR });
    await new Promise(r => setTimeout(r, 1000));

    console.log('5. Capturando prueba visual en tiempo real de WhatsApp...');
    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap && snap.result && snap.result.data) {
      const out = path.join(ASSETS_DIR, 'live_wa_with_image_verified.jpg');
      fs.writeFileSync(out, Buffer.from(snap.result.data, 'base64'));
      console.log('✅ CAPTURA WHATSAPP GUARDADA:', out);
    }

    ws.close();
  });
}

run();
