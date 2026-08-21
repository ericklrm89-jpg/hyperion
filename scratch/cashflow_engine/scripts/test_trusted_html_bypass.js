const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CDP_PORT = 9001;
const ASSETS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets';

const HTML_OFFER = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; line-height: 1.5; padding: 18px; background: #ffffff; border: 2px solid #2563eb; border-radius: 12px;">
  
  <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
    <span style="font-size: 20px; font-weight: 900; color: #0f172a;">⚡ NanoAI Industrial OS</span>
    <span style="background: #2563eb; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; margin-left: 8px; text-transform: uppercase;">100% AIR-GAPPED</span>
  </div>

  <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #0f172a;">
    ¿Cuánto le cuesta al mes mantener personal técnico para cotizar tirajes y calcular despiece?
  </p>
  
  <p style="margin: 0 0 12px 0; font-size: 12.5px; color: #475569;">
    <strong>Estimada Gerencia de Operaciones y Dirección General:</strong><br>
    En plantas industriales en Quito, mantener 2 a 3 técnicos cotizadores representa más de <strong>$3,600 USD mensuales en nómina fija e IESS</strong>... sumado al riesgo de cotizaciones lentas (48h) o descarte excesivo de material.
  </p>

  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; border-color: #cbd5e1; font-size: 12px; margin-bottom: 14px;">
    <tr bgcolor="#0f172a" style="color: #ffffff;">
      <th align="left" style="padding: 6px;">Concepto Operativo</th>
      <th align="center" style="padding: 6px;">Personal Manual (3 Personas)</th>
      <th align="right" style="padding: 6px;">NanoAI On-Premise</th>
    </tr>
    <tr>
      <td style="padding: 6px;">Nómina Fija (Sueldos + IESS)</td>
      <td align="center" style="color: #dc2626; font-weight: bold; padding: 6px;">-$3,600 USD / mes</td>
      <td align="right" style="color: #16a34a; font-weight: bold; padding: 6px;">$0 nómina</td>
    </tr>
    <tr>
      <td style="padding: 6px;">Tiempo de Cotización</td>
      <td align="center" style="padding: 6px;">24 a 48 horas</td>
      <td align="right" style="color: #2563eb; font-weight: bold; padding: 6px;">< 45 segundos</td>
    </tr>
    <tr>
      <td style="padding: 6px;">Merma de Material</td>
      <td align="center" style="padding: 6px;">8% a 15%</td>
      <td align="right" style="color: #16a34a; font-weight: bold; padding: 6px;">< 2% (Nesting)</td>
    </tr>
    <tr>
      <td style="padding: 6px; font-weight: bold;">Retorno Neto a Caja</td>
      <td align="center" style="color: #dc2626; font-weight: bold; padding: 6px;">Pérdida continua</td>
      <td align="right" style="color: #16a34a; font-weight: 900; font-size: 13.5px; padding: 6px;">+$4,200 USD / mes</td>
    </tr>
  </table>

  <div style="background: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 8px; padding: 10px; margin-bottom: 12px; font-size: 12px; color: #1e3a8a;">
    🎁 <strong>OFERTA HORMOZI DE LANZAMIENTO (QUITO):</strong><br>
    Incluye <strong>3 MESES GRATIS DE SOPORTE TÉCNICO</strong> más una <strong>visita técnica presencial de 20 minutos</strong> en su planta por nuestro Director Técnico, Erick.
  </div>

  <div style="text-align: center; margin-bottom: 10px;">
    <a href="https://wa.me/593998098229?text=Hola%20Erick,%20deseo%20coordinar%20la%20visita%20tecnica%20de%20NanoAI" style="background: #0f172a; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 12.5px; display: inline-block; border: 2px solid #2563eb;">
      📅 Agendar Demostración Técnica de 20 Minutos
    </a>
  </div>

  <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 11px; color: #64748b;">
    <strong>Erick R.</strong> &bull; Director Técnico — NanoAI Ecuador &bull; WhatsApp Directo: +593 99 809 8229<br>
    <a href="https://nanoai.ec" style="color: #2563eb; text-decoration: none; font-weight: 700;">https://nanoai.ec</a>
  </div>
</div>
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

    console.log('Probando inyección vía execCommand insertHTML (compatible con TrustedHTML)...');
    const testScript = `(() => {
      const editor = document.querySelector('div.editable[aria-label="Cuerpo del mensaje"]');
      if (!editor) return { success: false, reason: 'NO_EDITOR' };

      editor.focus();
      
      // Select existing contents
      const range = document.createRange();
      range.selectNodeContents(editor);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      // Execute insertHTML
      const success = document.execCommand('insertHTML', false, ${JSON.stringify(HTML_OFFER)});
      
      return {
        success,
        childrenCount: editor.children.length,
        textPreview: editor.innerText.slice(0, 100)
      };
    })()`;

    const res = await call('Runtime.evaluate', { expression: testScript, returnByValue: true });
    console.log('RESULTADO EXEC_COMMAND:', JSON.stringify(res, null, 2));

    await new Promise(r => setTimeout(r, 1000));

    // Tomar captura
    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap && snap.result && snap.result.data) {
      const out = path.join(ASSETS_DIR, 'live_gm_html_rendered_live.jpg');
      fs.writeFileSync(out, Buffer.from(snap.result.data, 'base64'));
      console.log('✅ CAPTURA CON TABLA RENDERIZADA GUARDADA:', out);
    }

    ws.close();
  });
}

run();
