const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CDP_PORT = 9001;
const ASSETS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets';

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
  const tabs = await getTabs();
  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com/mail/u/'));
  const ws = new WebSocket(gmTab.webSocketDebuggerUrl);

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

    console.log('Construyendo DOM puro 100% sin usar innerHTML...');
    const pureDomScript = `(() => {
      const editor = document.querySelector('div.editable[aria-label="Cuerpo del mensaje"]');
      if (!editor) return { success: false, reason: 'NO_EDITOR' };

      editor.focus();
      while (editor.firstChild) {
        editor.removeChild(editor.firstChild);
      }

      // Container Card
      const card = document.createElement('div');
      card.style.cssText = 'font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; color: #0f172a; line-height: 1.5; padding: 18px; background: #ffffff; border: 2px solid #2563eb; border-radius: 12px; max-width: 620px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.08);';

      // Header
      const header = document.createElement('div');
      header.style.cssText = 'border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;';
      
      const logo = document.createElement('span');
      logo.style.cssText = 'font-size: 20px; font-weight: 900; color: #0f172a;';
      logo.innerText = '⚡ NanoAI Industrial OS';
      
      const badge = document.createElement('span');
      badge.style.cssText = 'background: #2563eb; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; float: right;';
      badge.innerText = '🛡️ 100% AIR-GAPPED';

      header.appendChild(logo);
      header.appendChild(badge);
      card.appendChild(header);

      // Hook Title
      const h3 = document.createElement('h3');
      h3.style.cssText = 'font-size: 15px; font-weight: 900; color: #0f172a; margin: 0 0 8px 0;';
      h3.innerText = '¿Cuánto le cuesta al mes mantener personal técnico para cotizar tirajes y calcular despiece?';
      card.appendChild(h3);

      // Paragraph
      const p1 = document.createElement('p');
      p1.style.cssText = 'font-size: 12.5px; color: #475569; margin: 0 0 12px 0;';
      
      const p1Intro = document.createElement('strong');
      p1Intro.innerText = 'Estimada Gerencia de Operaciones y Dirección General:';
      p1.appendChild(p1Intro);
      p1.appendChild(document.createElement('br'));
      
      const p1Text = document.createTextNode('En plantas industriales en Quito, mantener 2 a 3 técnicos cotizadores representa más de ');
      p1.appendChild(p1Text);
      
      const p1Cost = document.createElement('strong');
      p1Cost.style.color = '#dc2626';
      p1Cost.innerText = '$3,600 USD mensuales en nómina fija e IESS';
      p1.appendChild(p1Cost);
      
      const p1Rest = document.createTextNode('... sumado al riesgo de cotizaciones lentas (48h) o descarte excesivo de material.');
      p1.appendChild(p1Rest);
      card.appendChild(p1);

      // Comparison Table
      const table = document.createElement('table');
      table.style.cssText = 'border-collapse: collapse; width: 100%; font-size: 12px; margin-bottom: 14px; border: 1px solid #cbd5e1;';
      
      const thead = document.createElement('tr');
      thead.style.cssText = 'background: #0f172a; color: #ffffff;';
      
      const th1 = document.createElement('th'); th1.style.cssText = 'padding: 6px; text-align: left;'; th1.innerText = 'Concepto Operativo';
      const th2 = document.createElement('th'); th2.style.cssText = 'padding: 6px; text-align: center;'; th2.innerText = 'Personal Manual (3 Personas)';
      const th3 = document.createElement('th'); th3.style.cssText = 'padding: 6px; text-align: right;'; th3.innerText = 'NanoAI On-Premise';
      thead.appendChild(th1); thead.appendChild(th2); thead.appendChild(th3);
      table.appendChild(thead);

      const rowsData = [
        ['Nómina Fija (Sueldos + IESS):', '-$3,600 USD / mes', '$0 nómina recurrente', '#dc2626', '#16a34a'],
        ['Tiempo de Cotización:', '24 a 48 horas', '< 45 segundos en vivo', '#64748b', '#2563eb'],
        ['Merma y Fuga de Material:', '8% a 15% del costo', '< 2% (Nesting algorítmico)', '#64748b', '#16a34a'],
        ['Recuperación Neta en Caja:', 'Pérdida continua', '+$4,200 USD / mes', '#dc2626', '#16a34a']
      ];

      rowsData.forEach(([c1, c2, c3, col2, col3], idx) => {
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom: 1px solid #e2e8f0;';
        if (idx === rowsData.length - 1) tr.style.fontWeight = 'bold';
        
        const td1 = document.createElement('td'); td1.style.cssText = 'padding: 6px;'; td1.innerText = c1;
        const td2 = document.createElement('td'); td2.style.cssText = 'padding: 6px; text-align: center; color: ' + col2 + '; font-weight: bold;'; td2.innerText = c2;
        const td3 = document.createElement('td'); td3.style.cssText = 'padding: 6px; text-align: right; color: ' + col3 + '; font-weight: bold; font-size: ' + (idx === 3 ? '13.5px' : '12px') + ';'; td3.innerText = c3;
        
        tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
        table.appendChild(tr);
      });
      card.appendChild(table);

      // Hormozi Offer Card
      const offer = document.createElement('div');
      offer.style.cssText = 'background: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 8px; padding: 10px; margin-bottom: 12px; font-size: 12px; color: #1e3a8a;';
      
      const offerTitle = document.createElement('strong');
      offerTitle.innerText = '🎁 OFERTA HORMOZI DE LANZAMIENTO (QUITO):';
      offer.appendChild(offerTitle);
      offer.appendChild(document.createElement('br'));
      
      const offerText = document.createTextNode('Incluye ');
      offer.appendChild(offerText);
      const offBold = document.createElement('strong'); offBold.innerText = '3 MESES GRATIS DE SOPORTE TÉCNICO';
      offer.appendChild(offBold);
      offer.appendChild(document.createTextNode(' más una '));
      const offBold2 = document.createElement('strong'); offBold2.innerText = 'visita técnica presencial de 20 minutos';
      offer.appendChild(offBold2);
      offer.appendChild(document.createTextNode(' en su planta por nuestro Director Técnico, Erick.'));
      card.appendChild(offer);

      // CTA Button
      const ctaWrap = document.createElement('div');
      ctaWrap.style.cssText = 'text-align: center; margin-bottom: 10px;';
      const ctaBtn = document.createElement('a');
      ctaBtn.href = 'https://wa.me/593998098229?text=Hola%20Erick,%20deseo%20coordinar%20la%20visita%20tecnica%20de%20NanoAI';
      ctaBtn.style.cssText = 'background: #0f172a; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 12.5px; display: inline-block; border: 2px solid #2563eb;';
      ctaBtn.innerText = '📅 Agendar Demostración Técnica de 20 Minutos';
      ctaWrap.appendChild(ctaBtn);
      card.appendChild(ctaWrap);

      // Signoff
      const signoff = document.createElement('div');
      signoff.style.cssText = 'border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 11px; color: #64748b;';
      const sBold = document.createElement('strong'); sBold.innerText = 'Erick R.';
      signoff.appendChild(sBold);
      signoff.appendChild(document.createTextNode(' • Director Técnico — NanoAI Ecuador • WhatsApp Directo: +593 99 809 8229'));
      signoff.appendChild(document.createElement('br'));
      const sLink = document.createElement('a');
      sLink.href = 'https://nanoai.ec';
      sLink.style.cssText = 'color: #2563eb; text-decoration: none; font-weight: bold;';
      sLink.innerText = 'https://nanoai.ec';
      signoff.appendChild(sLink);
      card.appendChild(signoff);

      editor.appendChild(card);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.dispatchEvent(new Event('change', { bubbles: true }));

      return {
        success: true,
        childrenInCard: card.children.length,
        editorText: editor.innerText.slice(0, 100)
      };
    })()`;

    const res = await call('Runtime.evaluate', { expression: pureDomScript, returnByValue: true });
    console.log('RESULTADO CONSTRUCCIÓN DOM PURO:', JSON.stringify(res, null, 2));

    await new Promise(r => setTimeout(r, 1000));

    // Inyectar Capa Manus Multicolor
    await call('Runtime.evaluate', { expression: CAPA_MANUS_MULTICOLOR });
    await new Promise(r => setTimeout(r, 1000));

    // Tomar captura
    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap && snap.result && snap.result.data) {
      const out = path.join(ASSETS_DIR, 'live_gm_html_rendered_live.jpg');
      fs.writeFileSync(out, Buffer.from(snap.result.data, 'base64'));
      console.log('✅ CAPTURA HD CON TABLA RENDERIZADA GUARDADA:', out);
    }

    ws.close();
  });
}

run();
