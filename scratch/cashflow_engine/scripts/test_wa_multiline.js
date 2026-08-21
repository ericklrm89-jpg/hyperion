const WebSocket = require('ws');
const http = require('http');

const CDP_PORT = 9001;

function getTabs() {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${CDP_PORT}/json`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function createCdpCaller(ws) {
  return (method, params = {}) => new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 999999);
    const handler = (data) => {
      try {
        const res = JSON.parse(data);
        if (res.id === id) {
          ws.removeListener('message', handler);
          if (res.error) reject(new Error(JSON.stringify(res.error)));
          else resolve(res.result || {});
        }
      } catch (e) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function testMultilineInsertion() {
  const tabs = await getTabs();
  const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!waTab) return;

  const ws = new WebSocket(waTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const call = createCdpCaller(ws);

  const lines = [
    "⚡ *NANOAI INDUSTRIAL OS* | _Optimización y Control_",
    "",
    "Estimado(a) *Gonzalo Chiriboga Chaves* (CONFITECA C.A.):",
    "",
    "📊 *IMPACTO FINANCIERO COMPROBADO:*",
    "🔴 *Método Actual:* -$3,600 USD/mes en nómina fija • 48h de espera",
    "🟢 *NanoAI Air-Gapped:* $0 nómina • < 45 seg cotización",
    "",
    "💰 *RETORNO NETO PROYECTADO:* +$4,200 USD / mes",
    "",
    "🎁 *OFERTA EXCLUSIVA QUITO:*",
    "✅ 3 Meses Gratis de Soporte Técnico",
    "✅ Visita técnica de 20 min en planta por Ing. Erick",
    "",
    "📅 ¿Qué día de esta semana podemos coordinar la visita técnica?"
  ];

  // Probar escribir en el composer de chat línea por línea con Shift+Enter
  console.log('Escribiendo en WhatsApp con Shift+Enter para saltos de línea perfectos...');
  
  await call('Runtime.evaluate', {
    expression: `(() => {
      const editables = Array.from(document.querySelectorAll('footer div[contenteditable="true"], div[contenteditable="true"]'));
      const composer = editables[editables.length - 1];
      if (composer) composer.focus();
      return !!composer;
    })()`
  });

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 0) {
      await call('Input.insertText', { text: line });
    }
    if (i < lines.length - 1) {
      // Shift + Enter
      await call('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 8, windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
      await call('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 8, windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
      await new Promise(r => setTimeout(r, 60));
    }
  }

  console.log('✅ Texto multilínea escrito con saltos de línea impecables.');
  ws.close();
}

testMultilineInsertion().catch(console.error);
