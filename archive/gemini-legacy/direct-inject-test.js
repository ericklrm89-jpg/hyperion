const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

function cdpCall(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 999999);
    const handler = (data) => {
      try {
        const res = JSON.parse(data);
        if (res.id === id) {
          ws.removeListener('message', handler);
          if (res.error) reject(new Error(JSON.stringify(res.error)));
          else resolve(res.result || {});
        }
      } catch(e) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

const ART = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea';
const logoPath   = path.join(ART, 'fairdraw_official_logo_1784899306001.png');
const hookPath   = path.join(ART, 'fairdraw_hook_v2_1784905233658.png');
const corePath   = path.join(ART, 'fairdraw_core_v2_1784905267550.png');
const climaxPath = path.join(ART, 'fairdraw_climax_v2_1784905302909.png');

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
  const tab = tabs.find(t => t.type === 'page' && t.url.includes('gemini.google.com') && !t.url.includes('RotateCookies'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  console.log('Connected to tab. Navigating to new conversation...');
  await cdpCall(ws, 'Page.navigate', { url: 'https://gemini.google.com/u/1/app?hl=es' });
  await wait(4000);

  // Hacer click en la bandeja de texto (el editor contenteditable) para enfocarla
  console.log('Clicking the prompt editor to focus it...');
  const editorPos = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const ed = document.querySelector('div[contenteditable="true"], textarea');
        if (ed) {
          const r = ed.getBoundingClientRect();
          return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
        }
        return null;
      })()
    `,
    returnByValue: true
  });
  if (editorPos.result && editorPos.result.value) {
    const ep = JSON.parse(editorPos.result.value);
    // Usar coordenadas para hacer click real
    const plusResult = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => {
            const aria = (b.getAttribute('aria-label') || '').toLowerCase().trim();
            return aria === 'subidas y herramientas' || aria === 'uploads and tools';
          });
          if (btn) {
            const r = btn.getBoundingClientRect();
            return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
          }
          return null;
        })()
      `,
      returnByValue: true
    });
    // Simplemente hacemos foco vía JS
    await cdpCall(ws, 'Runtime.evaluate', {
      expression: `
        (() => {
          const ed = document.querySelector('div[contenteditable="true"]');
          if (ed) { ed.focus(); return true; }
          return false;
        })()
      `
    });
    console.log('Focused.');
  }
  await wait(1000);

  console.log('Searching input[type=file] directly...');
  await cdpCall(ws, 'DOM.enable');
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const inputNode = await cdpCall(ws, 'DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]'
  });

  if (inputNode && inputNode.nodeId && inputNode.nodeId > 0) {
    console.log(`Input node found (nodeId: ${inputNode.nodeId}). Injecting files directly...`);
    await cdpCall(ws, 'DOM.setFileInputFiles', {
      nodeId: inputNode.nodeId,
      files: [logoPath, hookPath, corePath, climaxPath]
    });
    console.log('Files injected.');
    
    // Disparar evento 'change' en el input para que Gemini Web note la subida
    console.log('Dispatching change event...');
    await cdpCall(ws, 'Runtime.evaluate', {
      expression: `
        (() => {
          const inp = document.querySelector('input[type="file"]');
          if (inp) {
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
          return false;
        })()
      `
    });
  } else {
    console.log('Input node not found.');
  }

  await wait(5000); // Esperar miniaturas
  
  // Tomar screenshot
  const id = Math.floor(Math.random() * 999999);
  ws.send(JSON.stringify({ id, method: 'Page.captureScreenshot', params: { format: 'png' } }));
  ws.on('message', data => {
    const res = JSON.parse(data);
    if (res.id === id) {
      fs.writeFileSync('c10_direct_inject_test.png', Buffer.from(res.result.data, 'base64'));
      console.log('Saved c10_direct_inject_test.png');
      ws.close();
    }
  });
}

main().catch(console.error);
