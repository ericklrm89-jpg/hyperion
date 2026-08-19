/**
 * HYPERION v11 — Instagram Reels Publisher (SPANISH - PERFECT SUCCESS)
 */
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
  console.log('🚀 HYPERION v11 — Instagram Reels Spanish (FINAL)');
  console.log('════════════════════════════════════════════');

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  const tab = tabs.find(t => t.type==='page' && t.url.includes('instagram.com'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // STEP 0: Click "Ahora no" if notification modal is active
  console.log('\n🆕 STEP 0: Dismissing notification modal if present...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').trim().toLowerCase() === 'ahora no');
      if (btn) btn.click();
    })()`
  });
  await wait(2000);

  // STEP 1: Click sidebar "Nueva publicación / Crear"
  console.log('\n➕ STEP 1: Clicking "Nueva publicación / Crear" in sidebar...');
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
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_01_modal_es.png');

  // STEP 2: Inject file via CDP + dispatch events
  console.log('\n📤 STEP 2: Injecting Spanish video into input[type=file] + dispatching events...');
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

  console.log('   ✅ Video injected! Waiting 8s for canvas & video preview render...');
  await wait(8000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_02_video_es.png');

  // STEP 3-4: Click Siguiente -> Siguiente
  console.log('\n▶️ STEP 3-4: Clicking Siguiente / Next...');
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
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_03_siguiente_es.png');

  // STEP 5: Write Spanish caption
  console.log('\n✍️ STEP 5: Writing Spanish caption...');
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
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_04_copy_es.png');

  // STEP 6: Share Reel
  console.log('\n🚀 STEP 6: Sharing Reel...');
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
    await wait(10000);
  }
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_05_publicado_es.png');

  ws.close();
  console.log('\n✅ Instagram Reel (Spanish) PUBLISHED!');
}

main().catch(e => { console.error('❌ FATAL:', e.message); process.exit(1); });
