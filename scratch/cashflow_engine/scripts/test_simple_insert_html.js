const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CDP_PORT = 9001;
const ASSETS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets';

const HTML_SNIPPET = `
<div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
  <h2 style="color: #2563eb; margin: 0 0 10px 0;">⚡ NanoAI Industrial OS — Propuesta de Automatización</h2>
  <p><strong>Estimada Gerencia de Operaciones:</strong></p>
  <p>Elimine $3,600 USD mensuales en nómina de cotizadores manuales y reduzca el tiempo de respuesta a 45 segundos con 0% error de merma.</p>
  
  <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; border-color: #cbd5e1; width: 100%; margin: 15px 0;">
    <tr bgcolor="#0f172a" style="color: #ffffff;">
      <th>Concepto</th>
      <th>Manual</th>
      <th>Con NanoAI OS</th>
    </tr>
    <tr>
      <td>Nómina Fija</td>
      <td style="color: red;">-$3,600/mes</td>
      <td style="color: green; font-weight: bold;">$0 nómina</td>
    </tr>
    <tr>
      <td>Tiempo de Cotización</td>
      <td>24 a 48 horas</td>
      <td style="color: blue; font-weight: bold;">< 45 segundos</td>
    </tr>
    <tr>
      <td>Retorno Mensual</td>
      <td>Pérdida</td>
      <td style="color: green; font-weight: bold;">+$4,200/mes</td>
    </tr>
  </table>

  <p>🎁 <strong>Oferta:</strong> 3 Meses Gratis de Soporte Técnico + Visita Técnica Presencial.</p>
  <p>👉 <a href="https://wa.me/593998098229" style="background: #2563eb; color: #fff; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">Agendar Demostración (20 min)</a></p>
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

    console.log('Inyectando HTML mediante execCommand con foco explícito...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const textboxes = document.querySelectorAll('div[role="textbox"]');
        const box = textboxes[0];
        if (box) {
          box.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertHTML', false, \`${HTML_SNIPPET}\`);
          box.dispatchEvent(new Event('input', { bubbles: true }));
          return 'INSERTED_OK';
        }
        return 'NO_BOX';
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 1500));

    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap && snap.data) {
      const out = path.join(ASSETS_DIR, 'live_gm_draft_preview_to_user.jpg');
      fs.writeFileSync(out, Buffer.from(snap.data, 'base64'));
      console.log('✅ Captura guardada:', out);
    }

    ws.close();
    process.exit(0);
  });
}

run();
