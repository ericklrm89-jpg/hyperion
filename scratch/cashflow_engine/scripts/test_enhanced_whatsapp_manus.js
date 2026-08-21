const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CDP_PORT = 9001;
const ASSETS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets';

const ENHANCED_WA_MANUS = `
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
    { fill: 'rgba(239, 68, 68, 0.16)',  border: '#ef4444', badge: '#ef4444', text: '#ffffff' }, // Rojo
    { fill: 'rgba(34, 197, 94, 0.16)',  border: '#22c55e', badge: '#22c55e', text: '#000000' }, // Verde
    { fill: 'rgba(59, 130, 246, 0.16)', border: '#3b82f6', badge: '#3b82f6', text: '#ffffff' }, // Azul
    { fill: 'rgba(234, 179, 8, 0.16)',  border: '#eab308', badge: '#eab308', text: '#000000' }, // Amarillo
    { fill: 'rgba(168, 85, 247, 0.16)', border: '#a855f7', badge: '#a855f7', text: '#ffffff' }, // Violeta
    { fill: 'rgba(236, 72, 153, 0.16)', border: '#ec4899', badge: '#ec4899', text: '#ffffff' }  // Rosa
  ];

  function getAllDeepElements(root) {
    root = root || document;
    var selector = 'button, a, input, textarea, select, [role="button"], [role="menuitem"], [role="tab"], [role="link"], [role="switch"], [role="listitem"], [role="checkbox"], [role="textbox"], [role="gridcell"], [data-tab], [data-icon], span[data-icon], div._ak72, div._ak73, div._ak8q, [contenteditable="true"]';
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
    var seenRects = new Set();

    for (var i = 0; i < all.length; i++){
      try {
        var el = all[i];
        if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
        var r = el.getBoundingClientRect();
        if (r.width < 10 || r.height < 10) continue;
        if (r.right < 0 || r.bottom < 0 || r.left > w || r.top > h) continue;
        
        // Evitar duplicados exactos en la misma coordenada
        var key = Math.round(r.left) + '_' + Math.round(r.top) + '_' + Math.round(r.width) + '_' + Math.round(r.height);
        if (seenRects.has(key)) continue;
        seenRects.add(key);

        var aria2 = el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder') || el.getAttribute('data-icon') || '';
        var rawText = aria2 || el.textContent || '';
        var text = rawText.replace(/[\\u200b-\\u200f\\ufeff\\u00ad]/g, '').replace(/\\s+/g, ' ').trim().slice(0, 18);
        if (!text) continue;
        
        vis.push({ el: el, rect: r, text: text });
      } catch(e){}
    }
    return { type: 'CAPA MANUS WHATSAPP COMPLETA', elements: vis };
  }

  function render(){
    try {
      document.querySelectorAll('.hy-rr').forEach(function(e){ e.remove(); });
      var layer = getActiveLayerData();
      var els = layer.elements || [];
      
      var banner = document.createElement('div');
      banner.className = 'hy-rr';
      banner.style.cssText = 'top:4px;left:50%;transform:translateX(-50%);padding:5px 18px;background:rgba(15,23,42,0.95);border:2px solid #22c55e;border-radius:20px;font:bold 12px monospace;color:#22c55e;white-space:nowrap;box-shadow:0 6px 16px rgba(0,0,0,0.8);';
      banner.textContent = '⚡ ' + layer.type + ' [' + els.length + ' ELEMENTOS DETECTADOS]';
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

    console.log('Inyectando Capa Manus WhatsApp Completa...');
    await call('Runtime.evaluate', { expression: ENHANCED_WA_MANUS });
    await new Promise(r => setTimeout(r, 1000));

    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap && snap.result && snap.result.data) {
      const out = path.join(ASSETS_DIR, 'live_wa_enhanced_manus.jpg');
      fs.writeFileSync(out, Buffer.from(snap.result.data, 'base64'));
      console.log('✅ CAPTURA WHATSAPP MEJORADA GUARDADA:', out);
    }

    ws.close();
  });
}

run();
