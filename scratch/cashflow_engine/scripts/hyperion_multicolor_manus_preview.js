const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CDP_PORT = 9001;
const ASSETS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets';

const HTML_OFFER = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; line-height: 1.5; padding: 16px; background: #ffffff; border: 2px solid #2563eb; border-radius: 12px;">
  <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
    <span style="font-size: 20px; font-weight: 900; color: #0f172a;">⚡ NanoAI Industrial OS</span>
    <span style="background: #2563eb; color: #fff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; margin-left: 8px;">100% AIR-GAPPED</span>
  </div>

  <p style="margin: 0 0 10px 0; font-size: 13.5px;"><strong>¿Cuánto le cuesta al mes mantener técnicos cotizando manualmente?</strong></p>
  <p style="margin: 0 0 12px 0; font-size: 12.5px; color: #475569;">En fábricas en Quito, 3 cotizadores manuales representan más de <strong>$3,600 USD/mes en nómina fija</strong>, más 48h de espera y pérdidas por merma.</p>

  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; border-color: #cbd5e1; font-size: 12px; margin-bottom: 12px;">
    <tr bgcolor="#0f172a" style="color: #ffffff;">
      <th align="left">Concepto Operativo</th>
      <th align="center">Personal Manual (3 Personas)</th>
      <th align="right">NanoAI On-Premise</th>
    </tr>
    <tr>
      <td>Nómina Fija (Sueldos + IESS)</td>
      <td align="center" style="color: #dc2626; font-weight: bold;">-$3,600 USD/mes</td>
      <td align="right" style="color: #16a34a; font-weight: bold;">$0 nómina</td>
    </tr>
    <tr>
      <td>Tiempo de Cotización</td>
      <td align="center">24 a 48 horas</td>
      <td align="right" style="color: #2563eb; font-weight: bold;">< 45 segundos</td>
    </tr>
    <tr>
      <td>Retorno Neto a Caja</td>
      <td align="center" style="color: #dc2626;">Pérdida continua</td>
      <td align="right" style="color: #16a34a; font-weight: 900; font-size: 13px;">+$4,200 USD/mes</td>
    </tr>
  </table>

  <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 10px; margin-bottom: 12px; font-size: 12px; color: #1e3a8a;">
    🎁 <strong>OFERTA HORMOZI:</strong> 3 Meses Gratis de Soporte Técnico + Visita Técnica Presencial de 20 min en su fábrica.
  </div>

  <div style="text-align: center; margin-bottom: 10px;">
    <a href="https://wa.me/593998098229?text=Hola%20Erick,%20deseo%20la%20visita%20tecnica%20de%20NanoAI" style="background: #0f172a; color: #ffffff; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 12.5px; display: inline-block;">
      📅 Agendar Demostración Técnica (20 Min)
    </a>
  </div>

  <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 11px; color: #64748b;">
    <strong>Erick R.</strong> &bull; Director Técnico NanoAI Ecuador &bull; WhatsApp: +593 99 809 8229
  </div>
</div>
`;

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

  // Paleta de 6 colores vibrantes Manus
  var PALETTE = [
    { fill: 'rgba(239, 68, 68, 0.22)',  border: '#ef4444', badge: '#ef4444', text: '#ffffff' }, // Rojo
    { fill: 'rgba(34, 197, 94, 0.22)',  border: '#22c55e', badge: '#22c55e', text: '#000000' }, // Verde
    { fill: 'rgba(59, 130, 246, 0.22)', border: '#3b82f6', badge: '#3b82f6', text: '#ffffff' }, // Azul
    { fill: 'rgba(234, 179, 8, 0.22)',  border: '#eab308', badge: '#eab308', text: '#000000' }, // Amarillo
    { fill: 'rgba(168, 85, 247, 0.22)', border: '#a855f7', badge: '#a855f7', text: '#ffffff' }, // Violeta
    { fill: 'rgba(236, 72, 153, 0.22)', border: '#ec4899', badge: '#ec4899', text: '#ffffff' }  // Rosa
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
    return { type: 'CAPA MANUS MULTICOLOR', elements: vis };
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
  console.log('⚡ Inyectando Capa Manus Multicolor y renderizando contenido...');
  const tabs = await getTabs();
  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com/mail/u/'));
  if (!gmTab) return console.log('❌ No GM tab');

  const ws = new WebSocket(gmTab.webSocketDebuggerUrl, { maxPayload: 50 * 1024 * 1024 });

  ws.on('open', async () => {
    const call = (method, params = {}) => new Promise((resolve) => {
      const id = Math.floor(Math.random() * 99999);
      const h = (d) => {
        const j = JSON.parse(d);
        if (j.id === id) {
          ws.removeListener('message', h);
          resolve(j.result);
        }
      };
      ws.on('message', h);
      ws.send(JSON.stringify({ id, method, params }));
    });

    // 1. Inyectar HTML en el cuerpo de redacción
    console.log('Inyectando estructura HTML...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const body = document.querySelector('div[aria-label="Cuerpo del mensaje"]') || document.querySelector('div[role="textbox"]');
        if (body) {
          body.focus();
          body.innerHTML = \`${HTML_OFFER}\`;
          body.dispatchEvent(new Event('input', { bubbles: true }));
          body.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 1000));

    // 2. Inyectar Capa Manus Multicolor con bucle de 250ms
    console.log('Inyectando Capa Manus Multicolor...');
    await call('Runtime.evaluate', { expression: CAPA_MANUS_MULTICOLOR });
    await new Promise(r => setTimeout(r, 1000));

    // 3. Capturar pantalla
    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap && snap.data) {
      const out = path.join(ASSETS_DIR, 'live_gm_multicolor_manus.jpg');
      fs.writeFileSync(out, Buffer.from(snap.data, 'base64'));
      console.log('✅ CAPTURA MULTICOLOR GUARDADA:', out);
    }

    ws.close();
    process.exit(0);
  });
}

run();
