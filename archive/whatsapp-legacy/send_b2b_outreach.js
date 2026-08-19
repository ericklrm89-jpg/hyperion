const WebSocket = require('ws');
const http = require('http');

async function getGmailTab() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => {
        const tabs = JSON.parse(data);
        const gmailTab = tabs.find(t => t.url && t.url.includes('mail.google.com') && t.type === 'page');
        if (!gmailTab) reject(new Error('Pestaña de Gmail no encontrada'));
        else resolve(gmailTab);
      });
    }).on('error', reject);
  });
}

let _id = 1;
function cdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = _id++;
    const h = (data) => {
      const r = JSON.parse(data.toString());
      if (r.id === id) { ws.off('message', h); r.error ? reject(new Error(r.error.message)) : resolve(r.result); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// MANUS DYNAMIC OVERLAY SCRIPT (LEY ABSOLUTA #1)
const MANUS_DYNAMIC_OVERLAY = `
(function(){
  try {
    if (window.__HY_SINGLE_TIMER) { clearInterval(window.__HY_SINGLE_TIMER); window.__HY_SINGLE_TIMER = null; }
    document.querySelectorAll('.hy-el, .hy-st, .hy-rr').forEach(function(e){ e.remove(); });
    window.__HY_KILL_ALL = false;
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
        var aria2 = el.getAttribute('aria-label') || el.getAttribute('title') || '';
        var rawText = aria2 || el.textContent || '';
        var text = rawText.replace(/[\\u200b-\\u200f\\ufeff\\u00ad]/g, '').replace(/\\s+/g, ' ').trim().slice(0, 20);
        if (!text) continue;
        vis.push({ el: el, rect: r, text: text });
      } catch(e){}
    }
    return { type: 'GMAIL_INBOX', elements: vis };
  }

  function render(){
    try {
      document.querySelectorAll('.hy-rr').forEach(function(e){ e.remove(); });
      var layer = getActiveLayerData();
      var els = layer.elements || [];
      var info = document.createElement('div');
      info.className = 'hy-rr';
      info.style.cssText = 'top:3px;left:50%;transform:translateX(-50%);padding:3px 10px;background:rgba(0,0,0,0.85);border-radius:4px;font:bold 12px monospace;color:#00f0b5;border:1px solid #00f0b5;white-space:nowrap;';
      info.textContent = 'CAPA ACTIVA: ' + layer.type + ' [' + els.length + ' ELEMENTOS | HYPERION B2B ENGINE]';
      document.body.appendChild(info);
      for (var i = 0; i < Math.min(els.length, 50); i++){
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

async function createB2BDraft(targetBusiness, targetEmail, niche, city, serviceType, price) {
  console.log('═══════════════════════════════════════════════════');
  console.log(`  HYPERION B2B OUTREACH — ${targetBusiness}`);
  console.log('═══════════════════════════════════════════════════');

  const tab = await getGmailTab();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r, e) => { ws.on('open', r); ws.on('error', e); });
  console.log(`✅ Conectado a Gmail: ${tab.title}`);

  // 1. Inyectar Capa Manus Dinámica (Ley Absoluta #1)
  console.log('[HYPERION] Inyectando Capa Manus Dinámica...');
  await cdp(ws, 'Runtime.evaluate', { expression: MANUS_DYNAMIC_OVERLAY });
  await sleep(1000);

  // 2. Hacer clic en "Redactar" (Compose)
  console.log('[HYPERION] Buscando y activando botón Redactar...');
  const composeClicked = await cdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('div[role="button"][gh="cm"]') || 
                  document.querySelector('.T-I.T-I-KE.L3') || 
                  Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText && b.innerText.includes('Redactar'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });
  console.log(`[HYPERION] Clic en Redactar: ${composeClicked.result?.value}`);
  await sleep(2500);

  // 3. Rellenar campos del borrador (Destinatario, Asunto, Cuerpo)
  const subject = `Propuesta de Captación Digital para ${targetBusiness} (${city})`;
  const bodyText = `Hola equipo de ${targetBusiness},

Espero que se encuentren muy bien.

Estuve analizando la presencia digital de los negocios del sector ${niche} en ${city}, y noté una excelente oportunidad para incrementar la captación de clientes de alto valor hacia ${targetBusiness}.

Desarrollamos una solución de ${serviceType} con botón directo a WhatsApp y catálogo interactivo, diseñada para captar entre 15 a 30 nuevos clientes este mes.

El costo preferencial de implementación llave en mano es de $${price} USD (pago único contra entrega).

¿A qué número o correo les puedo compartir la demostración funcional interactiva que armamos para ustedes?

Saludos cordiales,
Erick — Especialista en Automatización & Desarrollo Web`;

  console.log('[HYPERION] Inyectando contenido del correo...');
  const fillResult = await cdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      // Destinatario
      const toField = document.querySelector('input[aria-label="Para"]') || 
                      document.querySelector('input[peoplekit-id]') ||
                      document.querySelector('input.agP');
      if (toField) {
        toField.value = '${targetEmail}';
        toField.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Asunto
      const subjField = document.querySelector('input[name="subjectbox"]');
      if (subjField) {
        subjField.value = ${JSON.stringify(subject)};
        subjField.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Cuerpo
      const bodyBox = document.querySelector('div[role="textbox"][aria-label*="Mensaje"]') || 
                      document.querySelector('.Am.Al.editable');
      if (bodyBox) {
        bodyBox.innerText = ${JSON.stringify(bodyText)};
        bodyBox.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });

  console.log(`[HYPERION] Borrador B2B preparado con éxito: ${fillResult.result?.value}`);
  console.log(`👉 Asunto: ${subject}`);
  console.log(`👉 Destinatario: ${targetEmail}`);

  ws.close();
  return { status: 'draft_ready', target: targetBusiness, email: targetEmail };
}

// Ejecutar para el primer prospecto calificado de la lista
createB2BDraft(
  "Odontología Especializada San Rafael",
  "contacto@dentistasquito1.com",
  "Odontología",
  "Quito",
  "Landing Page Ultra-Rápida + Bot de Citas",
  450
).catch(console.error);
