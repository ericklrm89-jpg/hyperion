const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CDP_PORT = 9001;
const FLYER_PATH = "C:\\hyperion\\scratch\\cashflow_engine\\public\\assets\\nanoai_b2b_square_hd_flyer.jpg";
const ASSETS_DIR = "C:\\hyperion\\scratch\\cashflow_engine\\public\\assets";

const ROBUST_MANUS_ENGINE = `(() => {
  const existing = document.getElementById('hyperion-manus-master-overlay');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'hyperion-manus-master-overlay';
  container.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483646;';
  document.body.appendChild(container);

  const banner = document.createElement('div');
  banner.id = 'hyperion-manus-banner';
  banner.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483647;background:linear-gradient(135deg, #090d16 0%, #0f172a 100%);border:2px solid #00ff66;box-shadow:0 8px 32px rgba(0,0,0,0.8), 0 0 15px rgba(0,255,102,0.3);border-radius:30px;padding:8px 24px;font-family:system-ui,-apple-system,sans-serif;color:#00ff66;font-size:14px;font-weight:900;letter-spacing:1px;text-transform:uppercase;display:flex;align-items:center;gap:10px;pointer-events:none;';
  banner.innerHTML = '⚡ CAPA ACTIVA: CAPA MANUS MULTICOLOR [<span id="manus-elem-count">0</span> ELEMENTOS]';
  document.body.appendChild(banner);

  const PALETTE = [
    { fill: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#ffffff', bg: '#ef4444' }, // Rojo
    { fill: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', text: '#000000', bg: '#22c55e' }, // Verde
    { fill: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#ffffff', bg: '#3b82f6' }, // Azul
    { fill: 'rgba(234, 179, 8, 0.15)', border: '#eab308', text: '#000000', bg: '#eab308' }, // Amarillo
    { fill: 'rgba(168, 85, 247, 0.15)', border: '#a855f7', text: '#ffffff', bg: '#a855f7' }, // Violeta
    { fill: 'rgba(236, 72, 153, 0.15)', border: '#ec4899', text: '#ffffff', bg: '#ec4899' }  // Rosa
  ];

  function render() {
    container.innerHTML = '';
    const selector = 'button, a, input, textarea, div[role="button"], div[contenteditable="true"], span[role="button"], [tabindex="0"]';
    const all = Array.from(document.querySelectorAll(selector));
    let count = 0;

    all.forEach(el => {
      if (el.closest('#hyperion-manus-master-overlay') || el.closest('#hyperion-manus-banner')) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      if (rect.top < -50 || rect.left < -50 || rect.top > window.innerHeight + 50 || rect.left > window.innerWidth + 50) return;
      
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

      count++;
      const color = PALETTE[(count - 1) % PALETTE.length];

      const box = document.createElement('div');
      box.style.cssText = 'position:absolute;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;border:2px solid ' + color.border + ';background:' + color.fill + ';pointer-events:none;border-radius:4px;box-sizing:border-box;';

      const badge = document.createElement('div');
      badge.style.cssText = 'position:absolute;left:0;top:-18px;background:' + color.bg + ';color:' + color.text + ';font-size:11px;font-weight:900;font-family:monospace;padding:1px 5px;border-radius:3px;box-shadow:0 2px 4px rgba(0,0,0,0.5);white-space:nowrap;line-height:14px;';
      badge.innerText = '[' + count + '] ' + (el.getAttribute('aria-label') || el.innerText || el.placeholder || el.tagName.toLowerCase()).substring(0, 16);

      box.appendChild(badge);
      container.appendChild(box);
    });

    const countSpan = document.getElementById('manus-elem-count');
    if (countSpan) countSpan.innerText = count;
  }

  render();
  if (window._manusInterval) clearInterval(window._manusInterval);
  window._manusInterval = setInterval(render, 250);
  return true;
})()`;

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

async function run() {
  const tabs = await getTabs();
  const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!waTab) throw new Error('WhatsApp tab not found');

  const ws = new WebSocket(waTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const call = createCdpCaller(ws);
  await call('DOM.enable');
  await call('Page.enable');

  console.log('1. Verificando estado de carga de WhatsApp Web...');
  let chatReady = false;
  for (let i = 0; i < 30; i++) {
    const res = await call('Runtime.evaluate', {
      expression: `(() => {
        const msgBox = document.querySelector('footer div[contenteditable="true"], div[data-tab="10"], div[data-tab="6"], div[role="textbox"]');
        const searchBox = document.querySelector('div[data-tab="3"], input[role="textbox"]');
        const mainPane = document.getElementById('main');
        return {
          hasMsgBox: !!msgBox,
          hasSearch: !!searchBox,
          hasMain: !!mainPane,
          ready: !!(msgBox || mainPane)
        };
      })()`,
      returnByValue: true
    });
    
    console.log(`Estado WhatsApp (intento ${i+1}):`, res.result?.value);
    if (res.result?.value?.ready) {
      chatReady = true;
      break;
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('2. Inyectando Capa Manus Multicolor en WhatsApp...');
  await call('Runtime.evaluate', { expression: ROBUST_MANUS_ENGINE });
  await new Promise(r => setTimeout(r, 1000));

  const initialSnap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  const waProofPath = path.join(ASSETS_DIR, 'live_wa_tested_verified.jpg');
  fs.writeFileSync(waProofPath, Buffer.from(initialSnap.data, 'base64'));
  console.log(`📸 Captura de WhatsApp guardada en: ${waProofPath}`);

  ws.close();
}

run().catch(console.error);
