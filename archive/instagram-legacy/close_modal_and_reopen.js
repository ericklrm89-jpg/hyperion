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

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  const tab = tabs.find(t => t.type==='page' && t.url.includes('instagram.com'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  console.log('Closing any open modal...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = Array.from(document.querySelectorAll('svg[aria-label="Cerrar"], svg[aria-label="Close"], button')).find(e => {
        const a = e.getAttribute('aria-label') || '';
        return a.toLowerCase() === 'cerrar' || a.toLowerCase() === 'close';
      });
      if (closeBtn) closeBtn.closest('button, div[role="button"]').click();
    })()`
  });
  await wait(2000);

  // Click "Descartar" if confirm dialog appears
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const discard = Array.from(document.querySelectorAll('button')).find(b => {
        const t = (b.textContent||'').toLowerCase();
        return t.includes('descartar') || t.includes('discard');
      });
      if (discard) discard.click();
    })()`
  });
  await wait(2000);

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

  console.log('Injecting file into fresh modal...');
  await cdpCall(ws, 'DOM.enable');
  const doc = await cdpCall(ws, 'DOM.getDocument');
  const fileInputs = await cdpCall(ws, 'DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });

  if (fileInputs.nodeIds && fileInputs.nodeIds.length > 0) {
    for (const nodeId of fileInputs.nodeIds) {
      const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId });
      await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: nodeInfo.node.backendNodeId, files: [VIDEO] });
    }
  }

  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const inputs = document.querySelectorAll('input[type="file"]');
      inputs.forEach(i => {
        i.dispatchEvent(new Event('change', { bubbles: true }));
        i.dispatchEvent(new Event('input', { bubbles: true }));
      });
    })()`
  });

  await wait(8000);

  // Click Siguiente -> Siguiente
  for (let step = 1; step <= 2; step++) {
    const nextBtn = await cdpCall(ws, 'Runtime.evaluate', {
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
    if (nextBtn.result?.value) {
      const p = JSON.parse(nextBtn.result.value);
      console.log(`   Siguiente ${step} at x=${p.x}, y=${p.y}`);
      await mouseClick(ws, p.x, p.y);
      await wait(3000);
    }
  }

  // Caption
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

  // Share
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
    await wait(8000);
  }

  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_fresh_success.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 Screenshot saved: ig_fresh_success.png');

  ws.close();
}

main().catch(console.error);
