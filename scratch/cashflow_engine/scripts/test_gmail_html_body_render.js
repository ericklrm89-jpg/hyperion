const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CDP_PORT = 9001;
const ASSETS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets';
const FLYER = path.join(ASSETS_DIR, 'nanoai_b2b_square_hd_flyer.jpg');

const EMAIL_DATA = {
  to: 'erickl.rm@gmail.com',
  subject: '⚡ NANOAI INDUSTRIAL OS — Recuperación de $4,200/mes y Cotizador en 45s [Propuesta Oficial]',
  body_html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 620px; line-height: 1.6; border: 1px solid #cbd5e1; border-radius: 16px; padding: 24px; background: #ffffff; margin: 0 auto; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08);">
  
  <!-- Header Branding -->
  <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px;">
    <span style="font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">⚡ NanoAI</span>
    <span style="background: #2563eb; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; margin-left: 8px; text-transform: uppercase;">Industrial OS</span>
    <span style="float: right; background: #ecfdf5; color: #059669; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; border: 1px solid #a7f3d0; text-transform: uppercase;">
      🛡️ 100% On-Premise Air-Gapped
    </span>
  </div>

  <!-- Hook Directo al Dolor de Nómina y Mermas -->
  <h2 style="font-size: 16.5px; font-weight: 900; color: #0f172a; margin-top: 0; margin-bottom: 10px; line-height: 1.35;">
    ¿Cuánto le cuesta al mes depender de personal para cotizar tirajes, despiezar planos y calcular mermas?
  </h2>
  
  <p style="font-size: 13.5px; color: #475569; margin-bottom: 16px;">
    <strong>Estimada Gerencia de Operaciones y Dirección General:</strong><br>
    En plantas industriales en Quito, mantener 2 o 3 técnicos para cotizar y calcular despiece representa más de <strong>$3,600 USD mensuales en nómina, IESS y horas extra</strong>... sumado al riesgo de que un cálculo manual tarde 48 horas o contenga errores de merma que le hagan perder dinero.
  </p>

  <!-- Side by Side Comparison Table -->
  <div style="background: #0f172a; border-radius: 12px; padding: 16px; color: #ffffff; margin-bottom: 20px; border: 1px solid #1e293b;">
    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 800; margin-bottom: 10px; text-align: center;">
      📉 COMPARATIVA FINANCIERA: PERSONAL MANUAL VS. NANOAI INDUSTRIAL OS
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
      <thead>
        <tr style="border-bottom: 2px solid #334155;">
          <th style="text-align: left; padding: 6px 0; color: #94a3b8;">Concepto Operativo</th>
          <th style="text-align: center; padding: 6px 0; color: #f87171;">Personal Manual (3 Personas)</th>
          <th style="text-align: right; padding: 6px 0; color: #34d399;">Con NanoAI On-Premise</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 8px 0; color: #cbd5e1;">Nómina fija (Sueldos + IESS):</td>
          <td style="padding: 8px 0; text-align: center; color: #f87171; font-weight: 700;">-$3,600 USD / mes</td>
          <td style="padding: 8px 0; text-align: right; color: #34d399; font-weight: 800;">$0 nómina recurrente</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 8px 0; color: #cbd5e1;">Tiempo de Cotización:</td>
          <td style="padding: 8px 0; text-align: center; color: #fca5a5;">24 a 48 horas</td>
          <td style="padding: 8px 0; text-align: right; color: #60a5fa; font-weight: 800;">< 45 segundos en vivo</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 8px 0; color: #cbd5e1;">Merma y Fuga de Material:</td>
          <td style="padding: 9px 0; text-align: center; color: #fca5a5;">8% a 15% del costo</td>
          <td style="padding: 9px 0; text-align: right; color: #34d399; font-weight: 800;">< 2% (Nesting algorítmico)</td>
        </tr>
        <tr>
          <td style="padding: 10px 0 0 0; color: #f8fafc; font-weight: 800;">Recuperación Neta en Caja:</td>
          <td style="padding: 10px 0 0 0; text-align: center; color: #ef4444; font-weight: 900;">Pérdida continua</td>
          <td style="padding: 10px 0 0 0; text-align: right; color: #10b981; font-weight: 900; font-size: 14.5px;">+$4,200 USD / mes</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Qué hace NanoAI -->
  <div style="margin-bottom: 18px;">
    <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px; text-transform: uppercase;">
      ⚡ Automatice Tareas Repetitivas y Blinde sus Fórmulas:
    </div>
    <ul style="margin: 0; padding-left: 18px; font-size: 12.5px; color: #334155; line-height: 1.6;">
      <li><strong>Cotizador Autónomo en 45 Segundos:</strong> Genera presupuestos formales en PDF con desglose exacto de materia prima y horas máquina.</li>
      <li><strong>Nesting y Despiece Algorítmico:</strong> Maximiza el aprovechamiento de materias primas reduciendo el descarte al mínimo.</li>
      <li><strong>Cero Nube / Seguridad Air-Gapped:</strong> Instalado físicamente en su fábrica. Sus costos y planos nunca tocan servidores externos.</li>
    </ul>
  </div>

  <!-- Hormozi $100M Offer -->
  <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 10px; padding: 14px; margin-bottom: 20px;">
    <div style="font-size: 13px; font-weight: 900; color: #1e40af; margin-bottom: 3px;">
      🎁 OFERTA IRRESISTIBLE DE LANZAMIENTO (QUITO)
    </div>
    <div style="font-size: 12.5px; color: #1e3a8a; line-height: 1.45;">
      Por la adquisición de la licencia On-Premise, incluimos <strong>3 MESES GRATIS DE SOPORTE TÉCNICO</strong> más una <strong>visita presencial de 20 minutos</strong> en su planta por nuestro Director Técnico, Erick.
    </div>
  </div>

  <!-- CTA Action Button -->
  <div style="text-align: center; margin-bottom: 18px;">
    <a href="https://wa.me/593998098229?text=Hola%20Erick,%20deseo%20coordinar%20la%20visita%20tecnica%20de%20NanoAI" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 800; font-size: 13px; border: 2px solid #2563eb; box-shadow: 0 6px 14px rgba(15,23,42,0.25);">
      📅 Agendar Demostración Técnica de 20 Minutos
    </a>
  </div>

  <!-- Signoff -->
  <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11.5px; color: #64748b; line-height: 1.45;">
    <strong>Erick R.</strong> &bull; Director Técnico — NanoAI Ecuador<br>
    Quito, Ecuador &bull; WhatsApp Directo: +593 99 809 8229<br>
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
    return { type: 'CAPA MANUS ACTIVA', elements: vis };
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

    console.log('1. Navegando a Inbox...');
    await call('Page.navigate', { url: 'https://mail.google.com/mail/u/0/#inbox' });
    await new Promise(r => setTimeout(r, 4000));

    console.log('2. Inyectando Capa Manus...');
    await call('Runtime.evaluate', { expression: CAPA_MANUS_SCRIPT });
    await new Promise(r => setTimeout(r, 1000));

    console.log('3. Haciendo clic en Redactar...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('div[gh="cm"]') || 
                    document.querySelector('div.T-I.T-I-KE.L3') || 
                    Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText && (b.innerText.includes('Redactar') || b.innerText.includes('Compose')));
        if (btn) btn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 2500));

    console.log('4. Inyectando Destinatario y Asunto...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const to = document.querySelector('input.agP.aFw') || 
                   document.querySelector('input[peoplekit-id]') || 
                   document.querySelector('input[aria-label="Para"]') ||
                   document.querySelector('input[aria-label="To recipients"]');
        if (to) {
          to.focus();
          document.execCommand('insertText', false, '${EMAIL_DATA.to}');
        }
        const subj = document.querySelector('input[name="subjectbox"]') || 
                     document.querySelector('input[aria-label="Asunto"]') || 
                     document.querySelector('input[aria-label="Subject"]');
        if (subj) {
          subj.focus();
          subj.value = '${EMAIL_DATA.subject}';
          subj.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('5. Inyectando plantilla HTML visual dentro del editor...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const body = document.querySelector('div[aria-label="Cuerpo del mensaje"]') || 
                     document.querySelector('div[aria-label="Message Body"]') || 
                     document.querySelector('div[role="textbox"]');
        if (body) {
          body.focus();
          body.innerHTML = \`${EMAIL_DATA.body_html}\`;
          body.dispatchEvent(new Event('input', { bubbles: true }));
          body.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 2000));

    if (fs.existsSync(FLYER)) {
      console.log(`6. Inyectando archivo adjunto HD: ${FLYER}...`);
      const doc = await call('DOM.getDocument', { depth: -1, pierce: true });
      const fileInput = await call('DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
      if (fileInput && fileInput.nodeId) {
        const desc = await call('DOM.describeNode', { nodeId: fileInput.nodeId });
        if (desc.node && desc.node.backendNodeId) {
          await call('DOM.setFileInputFiles', { backendNodeId: desc.node.backendNodeId, files: [FLYER] });
          console.log('Adjunto cargado.');
          await new Promise(r => setTimeout(r, 4000));
        }
      }
    }

    console.log('7. Capturando auditoría visual del correo renderizado antes de enviar...');
    const preSnap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (preSnap && preSnap.data) {
      const outPre = path.join(ASSETS_DIR, 'live_gm_rendered_proposal.jpg');
      fs.writeFileSync(outPre, Buffer.from(preSnap.data, 'base64'));
      console.log('📸 Vista previa guardada:', outPre);
    }

    console.log('8. Enviando correo...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const sendBtn = document.querySelector('div.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3') ||
                        document.querySelector('div[data-tooltip*="Enviar"]') || 
                        document.querySelector('div[data-tooltip*="Send"]');
        if (sendBtn) sendBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 6000));

    console.log('9. Navegando a Enviados (#sent)...');
    await call('Page.navigate', { url: 'https://mail.google.com/mail/u/0/#sent' });
    await new Promise(r => setTimeout(r, 4000));

    await call('Runtime.evaluate', { expression: CAPA_MANUS_SCRIPT });
    await new Promise(r => setTimeout(r, 1500));

    const postSnap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (postSnap && postSnap.data) {
      const outPost = path.join(ASSETS_DIR, 'live_gm_proposal_sent_verified.jpg');
      fs.writeFileSync(outPost, Buffer.from(postSnap.data, 'base64'));
      console.log('✅ CAPTURA AUDITADA FINAL ENVIADOS:', outPost);
    }

    ws.close();
    process.exit(0);
  });
}

run();
