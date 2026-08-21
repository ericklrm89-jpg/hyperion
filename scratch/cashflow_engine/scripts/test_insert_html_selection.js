const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CDP_PORT = 9001;
const ASSETS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets';

const EMAIL_DATA = {
  to: 'erickl.rm@gmail.com',
  subject: '⚡ NANOAI INDUSTRIAL OS — Cómo eliminar $3,600/mes en nómina técnica y cotizar en 45 segundos [Propuesta Visual]',
  body_html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 660px; line-height: 1.6; border: 1px solid #cbd5e1; border-radius: 16px; padding: 26px; background: #ffffff; margin: 0 auto; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08);">
  
  <!-- Header Branding -->
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px;">
    <div>
      <span style="font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">⚡ NanoAI</span>
      <span style="background: #2563eb; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; margin-left: 8px; text-transform: uppercase;">Industrial OS</span>
    </div>
    <span style="background: #ecfdf5; color: #059669; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; border: 1px solid #a7f3d0; text-transform: uppercase;">
      🛡️ 100% On-Premise Air-Gapped
    </span>
  </div>

  <!-- Hook Directo al Dolor de Nómina y Mermas -->
  <h2 style="font-size: 17px; font-weight: 900; color: #0f172a; margin-top: 0; margin-bottom: 12px; line-height: 1.35;">
    ¿Cuánto capital pierde su planta al mes dependiendo de cálculo manual para cotizar, despiezar planos y calcular mermas?
  </h2>
  
  <p style="font-size: 13.5px; color: #334155; margin-bottom: 18px; line-height: 1.65;">
    <strong>Estimada Gerencia de Operaciones y Dirección General:</strong><br>
    En plantas y fábricas en Quito, mantener un equipo de 2 a 3 técnicos/digitadores para cotizar pedidos y calcular despiece de materiales representa más de <strong>$3,600 USD mensuales en nómina fija, horas extra e IESS</strong>... sumado al riesgo de que una cotización tarde 48 horas en salir o contenga un error de merma que destruya el margen del pedido.
  </p>

  <!-- Side by Side Comparison Table -->
  <div style="background: #0f172a; border-radius: 12px; padding: 18px; color: #ffffff; margin-bottom: 22px; border: 1px solid #1e293b; box-shadow: 0 4px 15px rgba(15,23,42,0.15);">
    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 800; margin-bottom: 12px; text-align: center;">
      📉 COMPARATIVA FINANCIERA: PERSONAL MANUAL VS. NANOAI INDUSTRIAL OS
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
      <thead>
        <tr style="border-bottom: 2px solid #334155;">
          <th style="text-align: left; padding: 7px 0; color: #94a3b8;">Concepto Operativo</th>
          <th style="text-align: center; padding: 7px 0; color: #f87171;">Personal Manual (3 Personas)</th>
          <th style="text-align: right; padding: 7px 0; color: #34d399;">Con NanoAI On-Premise</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 9px 0; color: #cbd5e1;">Nómina fija (Sueldos + IESS):</td>
          <td style="padding: 9px 0; text-align: center; color: #f87171; font-weight: 700;">-$3,600 USD / mes</td>
          <td style="padding: 9px 0; text-align: right; color: #34d399; font-weight: 800;">$0 nómina recurrente</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 9px 0; color: #cbd5e1;">Tiempo de Cotización:</td>
          <td style="padding: 9px 0; text-align: center; color: #fca5a5;">24 a 48 horas</td>
          <td style="padding: 9px 0; text-align: right; color: #60a5fa; font-weight: 800;">< 45 segundos en vivo</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 9px 0; color: #cbd5e1;">Merma y Fuga de Material:</td>
          <td style="padding: 9px 0; text-align: center; color: #fca5a5;">8% a 15% del costo</td>
          <td style="padding: 9px 0; text-align: right; color: #34d399; font-weight: 800;">< 2% (Nesting algorítmico)</td>
        </tr>
        <tr>
          <td style="padding: 11px 0 0 0; color: #f8fafc; font-weight: 800;">Recuperación Neta en Caja:</td>
          <td style="padding: 11px 0 0 0; text-align: center; color: #ef4444; font-weight: 900;">Pérdida continua</td>
          <td style="padding: 11px 0 0 0; text-align: right; color: #10b981; font-weight: 900; font-size: 14.5px;">+$4,200 USD / mes</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Qué hace NanoAI -->
  <div style="margin-bottom: 20px;">
    <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px; text-transform: uppercase;">
      ⚡ Automatice Operaciones y Blinde sus Fórmulas:
    </div>
    <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155; line-height: 1.65;">
      <li><strong>Cotizador Autónomo en 45 Segundos:</strong> Genera presupuestos formales en PDF con desglose exacto de materia prima y horas máquina al instante.</li>
      <li><strong>Nesting y Despiece Algorítmico:</strong> Maximiza el aprovechamiento de materias primas reduciendo el descarte al mínimo físico posible.</li>
      <li><strong>Cero Nube / Seguridad Air-Gapped:</strong> Instalado físicamente en su fábrica. Sus planos, costos y márgenes nunca tocan servidores externos.</li>
    </ul>
  </div>

  <!-- Hormozi $100M Offer -->
  <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 10px; padding: 16px; margin-bottom: 22px;">
    <div style="font-size: 13.5px; font-weight: 900; color: #1e40af; margin-bottom: 4px;">
      🎁 OFERTA IRRESISTIBLE DE LANZAMIENTO (QUITO)
    </div>
    <div style="font-size: 12.5px; color: #1e3a8a; line-height: 1.5;">
      Por la adquisición de la licencia On-Premise este mes, incluimos <strong>3 MESES GRATIS DE SOPORTE TÉCNICO</strong> más una <strong>visita presencial de 20 minutos</strong> en su planta por nuestro Director Técnico, Erick.
    </div>
  </div>

  <!-- CTA Action Button -->
  <div style="text-align: center; margin-bottom: 20px;">
    <a href="https://wa.me/593998098229?text=Hola%20Erick,%20deseo%20coordinar%20la%20visita%20tecnica%20de%20NanoAI" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 8px; font-weight: 800; font-size: 13.5px; border: 2px solid #2563eb; box-shadow: 0 6px 14px rgba(15,23,42,0.25);">
      📅 Agendar Demostración Técnica de 20 Minutos
    </a>
  </div>

  <!-- Signoff -->
  <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11.5px; color: #64748b; line-height: 1.5;">
    <strong>Erick R.</strong> &bull; Director Técnico — NanoAI Ecuador<br>
    Quito, Ecuador &bull; WhatsApp Directo: +593 99 809 8229<br>
    <a href="https://nanoai.ec" style="color: #2563eb; text-decoration: none; font-weight: 700;">https://nanoai.ec</a>
  </div>

</div>
`
};

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

    console.log('1. Llenando Destinatario, Asunto y Cuerpo con Selection Range...');
    const res = await call('Runtime.evaluate', {
      expression: `(() => {
        // Destinatario
        const to = document.querySelector('input.agP.aFw') || 
                   document.querySelector('input[peoplekit-id]') || 
                   document.querySelector('input[aria-label="Para"]');
        if (to) {
          to.focus();
          to.value = '${EMAIL_DATA.to}';
          to.dispatchEvent(new InputEvent('input', { bubbles: true, data: '${EMAIL_DATA.to}' }));
          to.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        }

        // Asunto
        const subj = document.querySelector('input[name="subjectbox"]') || 
                     document.querySelector('input[aria-label="Asunto"]');
        if (subj) {
          subj.focus();
          subj.value = '${EMAIL_DATA.subject}';
          subj.dispatchEvent(new InputEvent('input', { bubbles: true, data: '${EMAIL_DATA.subject}' }));
        }

        // Cuerpo HTML via Selection + insertHTML
        const body = document.querySelector('div[aria-label="Cuerpo del mensaje"]') || 
                     document.querySelector('div[role="textbox"]');
        if (body) {
          body.focus();
          const range = document.createRange();
          range.selectNodeContents(body);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('insertHTML', false, \`${EMAIL_DATA.body_html}\`);
          return 'HTML_INJECTED_VIA_SELECTION';
        }
        return 'BODY_NOT_FOUND';
      })()`,
      returnByValue: true
    });
    console.log('Resultado:', res.result?.value);
    await new Promise(r => setTimeout(r, 2000));

    // Capturar pantalla del compose modal
    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap && snap.data) {
      const out = path.join(ASSETS_DIR, 'live_gm_rendered_proposal.jpg');
      fs.writeFileSync(out, Buffer.from(snap.data, 'base64'));
      console.log('📸 Captura del correo con tabla visible guardada:', out);
    }

    ws.close();
    process.exit(0);
  });
}

run();
