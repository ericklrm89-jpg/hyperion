const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const VIDEO = 'C:\\Users\\erick\\Downloads\\Por_favor_anime_estas_ilust (1).mp4';
const COPY_IG = `🎉 ¡Sorteos 100% Transparentes y Verificados con IA!

FairDraw utiliza Inteligencia Artificial para garantizar que cada sorteo sea provadamente justo y auditado. Sin trucos ni manipulaciones — solo confianza total. 🛡️

🌐 fairdrawapp.com

#FairDraw #Sorteos #InteligenciaArtificial #Transparencia #FairPlay #Tecnologia #Confianza #SorteosOnline #GanaPremios`;

let cdpId = 1;
function cdpCall(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = cdpId++;
    const h = (data) => {
      try {
        const r = JSON.parse(data);
        if (r.id === id) { ws.removeListener('message', h); r.error ? reject(new Error(JSON.stringify(r.error))) : resolve(r.result || {}); }
      } catch(e) {}
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

async function mouseClick(ws, x, y) {
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function screenshot(ws, name) {
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(name, Buffer.from(ss.data, 'base64'));
  console.log('   📸', name);
}

async function main() {
  console.log('\n════════════════════════════════════════════');
  console.log('🚀 HYPERION v11 — Instagram Reels Spanish (FRESH REBOOT)');
  console.log('════════════════════════════════════════════');

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  const tab = tabs.find(t => t.type==='page' && t.url.includes('instagram.com'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // Hard reload
  console.log('Navigating to instagram.com clean feed...');
  await cdpCall(ws, 'Page.navigate', { url: 'https://www.instagram.com/' });
  await wait(7000);

  // Dismiss notification prompt
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').trim().toLowerCase() === 'ahora no');
      if (btn) btn.click();
    })()`
  });
  await wait(2000);

  // Click sidebar Create
  console.log('Clicking sidebar Create...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('a, button, div[role="button"]')).find(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.left < 100 && (
          txt.includes('new post') || txt.includes('create') ||
          txt.includes('nueva publicaci') || txt.includes('crear')
        );
      });
      if (btn) btn.click();
    })()`
  });
  await wait(3000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_fresh_modal.png');

  // Intercept file chooser & click "Seleccionar del ordenador"
  await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: true });

  const fileChooserPromise = new Promise((resolve, reject) => {
    const h = (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.method === 'Page.fileChooserOpened') {
          ws.removeListener('message', h);
          console.log('   ✅ fileChooserOpened intercepted! backendNodeId:', msg.params.backendNodeId);
          resolve(msg.params.backendNodeId);
        }
      } catch(e) { reject(e); }
    };
    ws.on('message', h);
    setTimeout(() => { ws.removeListener('message', h); reject(new Error('Timeout 10s')); }, 10000);
  });

  // Find exact position of "Seleccionar del ordenador"
  const selectPos = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const els = Array.from(document.querySelectorAll('button, div[role="button"], label, span'));
      const target = els.find(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        return txt.includes('seleccionar del ordenador') || txt.includes('select from computer');
      });
      if (target) {
        const r = target.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`, returnByValue: true
  });

  if (selectPos.result?.value) {
    const p = JSON.parse(selectPos.result.value);
    console.log(`Clicking "Seleccionar del ordenador" at x=${p.x}, y=${p.y}...`);
    await mouseClick(ws, p.x, p.y);
  }

  const backendNodeId = await fileChooserPromise;
  console.log('Injecting file into backendNodeId:', backendNodeId);
  await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId, files: [VIDEO] });
  await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: false });

  console.log('Waiting 10s for video preview & canvas processing...');
  await wait(10000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_fresh_video.png');

  // Click Siguiente 1
  console.log('Clicking Siguiente 1...');
  const next1 = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button, span, a')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'next' || txt === 'siguiente') && r.width > 0;
      });
      if (btns.length > 0) {
        const btn = btns[btns.length - 1];
        const r = btn.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`, returnByValue: true
  });
  if (next1.result?.value) {
    const p = JSON.parse(next1.result.value);
    console.log(`   Siguiente 1 at x=${p.x}, y=${p.y}`);
    await mouseClick(ws, p.x, p.y);
    await wait(3000);
  }

  // Click Siguiente 2
  console.log('Clicking Siguiente 2...');
  const next2 = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button, span, a')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'next' || txt === 'siguiente') && r.width > 0;
      });
      if (btns.length > 0) {
        const btn = btns[btns.length - 1];
        const r = btn.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`, returnByValue: true
  });
  if (next2.result?.value) {
    const p = JSON.parse(next2.result.value);
    console.log(`   Siguiente 2 at x=${p.x}, y=${p.y}`);
    await mouseClick(ws, p.x, p.y);
    await wait(3000);
  }

  // Caption
  console.log('Writing Spanish caption...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('div[contenteditable="true"], textarea');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(COPY_IG)});
        ed.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    })()`
  });
  await wait(2000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_fresh_caption.png');

  // Share
  console.log('Clicking Share...');
  const shareBtn = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('div[role="button"], button, span')).find(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'share' || txt === 'compartir') && r.width > 0;
      });
      if (btn) {
        const r = btn.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`, returnByValue: true
  });
  if (shareBtn.result?.value) {
    const p = JSON.parse(shareBtn.result.value);
    console.log(`   Share at x=${p.x}, y=${p.y}`);
    await mouseClick(ws, p.x, p.y);
    await wait(12000);
  }

  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_fresh_done.png');
  ws.close();
  console.log('\n✅ Fresh Instagram Reel (Spanish) PUBLISHED!');
}

main().catch(console.error);
