const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CDP_PORT = 9001;
const ASSETS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets';

const EMAIL_DATA = {
  body_html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.6; padding: 18px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px;">
  
  <!-- Header Branding -->
  <div style="border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px;">
    <span style="font-size: 20px; font-weight: 900; color: #0f172a;">⚡ NanoAI Industrial OS</span>
    <span style="background: #ecfdf5; color: #059669; font-size: 10.5px; font-weight: 800; padding: 3px 10px; border-radius: 12px; border: 1px solid #a7f3d0; margin-left: 10px; text-transform: uppercase;">
      🛡️ 100% On-Premise Air-Gapped
    </span>
  </div>

  <h3 style="font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 0; margin-bottom: 8px;">
    ¿Cuánto le cuesta al mes depender de personal técnico para cotizar y calcular mermas?
  </h3>
  
  <p style="font-size: 13px; color: #334155; margin-bottom: 14px;">
    <strong>Estimada Gerencia de Operaciones y Dirección General:</strong><br>
    En plantas industriales en Quito, mantener 2 a 3 técnicos/digitadores representa más de <strong>$3,600 USD mensuales en nómina fija, horas extra e IESS</strong>... sumado a pérdidas por cotizaciones lentas o errores en cálculo de mermas.
  </p>

  <!-- Side by Side Comparison Table -->
  <div style="background: #0f172a; border-radius: 10px; padding: 14px; color: #ffffff; margin-bottom: 16px;">
    <div style="font-size: 10.5px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 800; margin-bottom: 10px; text-align: center;">
      📉 COMPARATIVA: PERSONAL MANUAL VS. NANOAI INDUSTRIAL OS
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <thead>
        <tr style="border-bottom: 1px solid #334155;">
          <th style="text-align: left; padding: 6px 0; color: #94a3b8;">Concepto</th>
          <th style="text-align: center; padding: 6px 0; color: #f87171;">Personal (3 Personas)</th>
          <th style="text-align: right; padding: 6px 0; color: #34d399;">Con NanoAI</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 7px 0; color: #cbd5e1;">Nómina fija (Sueldos + IESS):</td>
          <td style="padding: 7px 0; text-align: center; color: #f87171; font-weight: 700;">-$3,600 USD / mes</td>
          <td style="padding: 7px 0; text-align: right; color: #34d399; font-weight: 800;">$0 recurrente</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 7px 0; color: #cbd5e1;">Tiempo de Cotización:</td>
          <td style="padding: 7px 0; text-align: center; color: #fca5a5;">24 a 48 horas</td>
          <td style="padding: 7px 0; text-align: right; color: #60a5fa; font-weight: 800;">< 45 segundos</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 7px 0; color: #cbd5e1;">Merma de Material:</td>
          <td style="padding: 7px 0; text-align: center; color: #fca5a5;">8% a 15%</td>
          <td style="padding: 7px 0; text-align: right; color: #34d399; font-weight: 800;">< 2% (Nesting)</td>
        </tr>
        <tr>
          <td style="padding: 8px 0 0 0; color: #f8fafc; font-weight: 800;">Recuperación en Caja:</td>
          <td style="padding: 8px 0 0 0; text-align: center; color: #ef4444; font-weight: 900;">Pérdida</td>
          <td style="padding: 8px 0 0 0; text-align: right; color: #10b981; font-weight: 900; font-size: 13.5px;">+$4,200 USD / mes</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Hormozi Offer -->
  <div style="background: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
    <div style="font-size: 12px; font-weight: 900; color: #1e40af; margin-bottom: 3px;">
      🎁 OFERTA DE LANZAMIENTO (QUITO)
    </div>
    <div style="font-size: 12px; color: #1e3a8a; line-height: 1.45;">
      Incluye <strong>3 MESES GRATIS DE SOPORTE</strong> y <strong>visita técnica de 20 min en su fábrica</strong> por nuestro Director, Erick.
    </div>
  </div>

  <!-- CTA -->
  <div style="text-align: center; margin-bottom: 14px;">
    <a href="https://wa.me/593998098229?text=Hola%20Erick,%20deseo%20coordinar%20la%20visita%20tecnica%20de%20NanoAI" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 800; font-size: 12.5px; border: 1.5px solid #2563eb;">
      📅 Agendar Demostración Técnica de 20 Minutos
    </a>
  </div>

  <!-- Signoff -->
  <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 11px; color: #64748b;">
    <strong>Erick R.</strong> &bull; Director Técnico — NanoAI Ecuador &bull; WhatsApp: +593 99 809 8229<br>
    <a href="https://nanoai.ec" style="color: #2563eb; text-decoration: none; font-weight: 700;">https://nanoai.ec</a>
  </div>

</div>`
};

const CAPA_MANUS_SCRIPT = `
(function(){
  try {
    if (window.__HY_SINGLE_TIMER) { clearInterval(window.__HY_SINGLE_TIMER); window.__HY_SINGLE_TIMER = null; }
    document.querySelectorAll('.hy-el, .hy-st, .hy-rr').forEach(function(e){ e.remove(); });
  } catch(e){}

  if(!document.querySelector('.hy-st')){
    var s = document.createElement('style');
    s.className = 'hy-st';
    s.textContent = '.hy-rr{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 11px/13px monospace;color:#fff;text-shadow:0 0 3px #000,0 0 6px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;}';
    document.head.appendChild(s);
  }

  var C = [
    {f:'rgba(255,0,0,0.4)', b:'#F00'}, {f:'rgba(0,200,0,0.4)', b:'#0C0'},
    {f:'rgba(0,100,255,0.4)', b:'#06F'}, {f:'rgba(200,200,0,0.4)', b:'#CC0'}
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
        var text = rawText.replace(/[\\u200b-\\u200f\\ufeff\\u00ad]/g, '').replace(/\\s+/g, ' ').trim().slice(0, 20);
        if (!text) continue;
        vis.push({ el: el, rect: r, text: text });
      } catch(e){}
    }
    return { type: 'CAPA MANUS GMAIL', elements: vis };
  }

  function render(){
    try {
      document.querySelectorAll('.hy-rr').forEach(function(e){ e.remove(); });
      var layer = getActiveLayerData();
      var els = layer.elements || [];
      var info = document.createElement('div');
      info.className = 'hy-rr';
      info.style.cssText = 'top:3px;left:50%;transform:translateX(-50%);padding:4px 14px;background:rgba(15,23,42,0.9);border-radius:20px;font:bold 12px monospace;color:#00ff66;border:2px solid #00ff66;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.8);';
      info.textContent = layer.type + ' [' + els.length + ' ELEMENTOS MAPEADOS]';
      document.body.appendChild(info);
      for (var i = 0; i < els.length; i++){
        var e = els[i], r = e.rect, c = C[i % C.length];
        var d = document.createElement('div');
        d.className = 'hy-rr';
        d.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;background:' + c.f + ';border:2px solid ' + c.b + ';';
        d.textContent = '[' + (i + 1) + '] ' + e.text.slice(0, 15);
        document.body.appendChild(d);
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
  console.log('⚡ Renderizando HTML dentro de Box 1 con enfoque y limpieza...');
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

    // 1. Cerrar el borrador vacío de la derecha (Box 2)
    console.log('1. Cerrando borrador vacío de la derecha...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const closeBtns = document.querySelectorAll('img[alt="Guardar y cerrar"], div[aria-label="Guardar y cerrar"], div.Ha');
        if (closeBtns.length > 1) {
          closeBtns[closeBtns.length - 1].click(); // cierra el último abierto
          return 'CLOSED_RIGHT_BOX';
        }
        return 'ONLY_ONE_BOX';
      })()`,
      returnByValue: true
    });
    await new Promise(r => setTimeout(r, 1000));

    // 2. Enfocar el cuerpo del mensaje en el borrador principal
    console.log('2. Enfocando e inyectando HTML en el cuerpo de redacción...');
    const injectRes = await call('Runtime.evaluate', {
      expression: `(() => {
        const bodies = document.querySelectorAll('div[aria-label="Cuerpo del mensaje"], div[role="textbox"]');
        const mainBody = bodies[0];
        if (mainBody) {
          mainBody.focus();
          mainBody.innerHTML = \`${EMAIL_DATA.body_html}\`;
          mainBody.dispatchEvent(new Event('input', { bubbles: true }));
          mainBody.dispatchEvent(new Event('change', { bubbles: true }));
          return 'HTML_SET_SUCCESS';
        }
        return 'NO_MAIN_BODY';
      })()`,
      returnByValue: true
    });
    console.log('Resultado Inyección:', injectRes.result?.value);
    await new Promise(r => setTimeout(r, 1500));

    // 3. Inyectar Capa Manus
    console.log('3. Inyectando Capa Manus para captura visual...');
    await call('Runtime.evaluate', { expression: CAPA_MANUS_SCRIPT });
    await new Promise(r => setTimeout(r, 1000));

    // 4. Tomar captura en tiempo real
    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap && snap.data) {
      const out = path.join(ASSETS_DIR, 'live_gm_draft_preview_to_user.jpg');
      fs.writeFileSync(out, Buffer.from(snap.data, 'base64'));
      console.log('✅ CAPTURA CON TABLA RENDERIZADA GUARDADA:', out);
    }

    ws.close();
    process.exit(0);
  });
}

run();
