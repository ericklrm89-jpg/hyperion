const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CDP_PORT = 9001;
const ASSETS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets';

const HTML_CONTENT = `<table border="1" cellpadding="8" style="border-collapse:collapse;width:100%;font-family:Arial;">
<tr bgcolor="#0f172a" style="color:#ffffff;"><th>CONCEPTO</th><th>MANUAL</th><th>NANOAI</th></tr>
<tr><td>Nomina Mensual</td><td style="color:red;">-$3,600 USD</td><td style="color:green;font-weight:bold;">$0 USD</td></tr>
<tr><td>Tiempo Cotizacion</td><td>48 Horas</td><td style="color:blue;font-weight:bold;">45 Segundos</td></tr>
</table>`;

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
  if (!gmTab) return;

  const ws = new WebSocket(gmTab.webSocketDebuggerUrl);
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

    console.log('Probando inyección vía Paste Event y Range.createContextualFragment...');
    const res = await call('Runtime.evaluate', {
      expression: `(() => {
        const editor = document.querySelector('div.editable[aria-label="Cuerpo del mensaje"]');
        if (!editor) return 'NO_EDITOR';

        editor.focus();

        // 1. Método Contextual Fragment
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.deleteContents();
        const fragment = range.createContextualFragment(\`${HTML_CONTENT}\`);
        range.insertNode(fragment);
        
        // 2. Dispatch events
        editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));

        return { success: true, children: editor.children.length, text: editor.innerText };
      })()`,
      returnByValue: true
    });

    console.log('Resultado:', JSON.stringify(res.result?.value));
    await new Promise(r => setTimeout(r, 1000));

    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap && snap.data) {
      const out = path.join(ASSETS_DIR, 'live_gm_html_rendered_live.jpg');
      fs.writeFileSync(out, Buffer.from(snap.data, 'base64'));
      console.log('Guardado:', out);
    }
    ws.close();
  });
}

run();
