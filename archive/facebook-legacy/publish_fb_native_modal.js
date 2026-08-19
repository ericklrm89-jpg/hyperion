/**
 * HYPERION — Facebook Native Profile Feed Post Publisher
 */
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const VIDEO = 'C:\\FairDraw\\fairdraw-social\\output\\fairdraw_promo_final.mp4';
const COPY_FB = `🚀 ¿Quieres hacer crecer tus redes de 0 a 10K seguidores reales?

El secreto de los creadores que más crecen no es publicar 5 veces al día, es usar dinámicas virales de alta retención. Con FairDraw atraes público calificado de tu nicho, multiplicas la interacción de tu perfil y conviertes espectadores en clientes fieles. 📈⚡

🌐 fairdrawapp.com

#CrecimientoOrganico #CrecerEnInstagram #CrecerEnTikTok #Emprendedores #MarketingDigital #EstrategiaDigital #CreadoresDeContenido #FairDraw #RedesSociales`;

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
  console.log('   📸 Screenshot saved:', name);
}

async function main() {
  console.log('\n============================================');
  console.log('🚀 HYPERION — Facebook Native Profile Post');
  console.log('============================================');

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  const fbTab = tabs.find(t => t.type==='page' && t.url.includes('facebook.com'));
  if (!fbTab) throw new Error('No FB tab');

  const ws = new WebSocket(fbTab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // STEP 0: Go to main facebook home
  console.log('\n🆕 STEP 0: Navigating to https://www.facebook.com/ ...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.onbeforeunload = null; window.location.href='https://www.facebook.com/';" });
  await wait(7000);

  // STEP 1: Click "What's on your mind, FairDraw App?" composer bar
  console.log('\n➕ STEP 1: Opening Post Modal ("What\'s on your mind?")...');
  const composerClicked = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const el = Array.from(document.querySelectorAll('span, div')).find(e => {
        const txt = (e.textContent || '').toLowerCase();
        return txt.includes("what's on your mind") || txt.includes("¿qué estás pensando") || txt.includes("crear publicación");
      });
      if (el) {
        const r = el.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });
  if (composerClicked.result?.value) {
    const p = JSON.parse(composerClicked.result.value);
    console.log(`   Composer clicked at x=${p.x}, y=${p.y}`);
    await mouseClick(ws, p.x, p.y);
  } else {
    await mouseClick(ws, 420, 140);
  }
  await wait(4000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_nat_01_modal_opened.png');

  // STEP 2: Click Photo/Video icon or inject file input
  console.log('\n📤 STEP 2: Injecting video file into post modal...');
  await cdpCall(ws, 'DOM.enable');
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  let fileInputs = await cdpCall(ws, 'DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  
  if (!fileInputs.nodeIds || fileInputs.nodeIds.length === 0) {
    console.log('   Clicking Photo/video button to reveal file input...');
    await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('div[role="button"], span, div')).find(e => {
          const aria = (e.getAttribute('aria-label') || '').toLowerCase();
          const txt = (e.textContent || '').toLowerCase();
          return aria.includes('foto/video') || aria.includes('photo/video') || txt.includes('foto/video');
        });
        if (btn) btn.click();
      })()`
    });
    await wait(3000);
    const doc2 = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
    fileInputs = await cdpCall(ws, 'DOM.querySelectorAll', { nodeId: doc2.root.nodeId, selector: 'input[type="file"]' });
  }

  if (fileInputs.nodeIds && fileInputs.nodeIds.length > 0) {
    for (const nodeId of fileInputs.nodeIds) {
      const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId });
      await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: nodeInfo.node.backendNodeId, files: [VIDEO] });
    }
    console.log('   ✅ Video file injected!');
  }
  console.log('   Waiting 10s for video processing...');
  await wait(10000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_nat_02_video_attached.png');

  // STEP 3: Write caption
  console.log('\n✍️ STEP 3: Writing caption...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('div[contenteditable="true"], textarea');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(COPY_FB)});
        ed.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`
  });
  await wait(2000);

  // STEP 3B: Press Escape to close hashtag popup
  console.log('\n🧹 STEP 3B: Dismissing hashtag popup...');
  await cdpCall(ws, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape' });
  await cdpCall(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape' });
  await wait(1500);

  // STEP 4: Click Publicar / Post
  console.log('\n🚀 STEP 4: Clicking Publicar / Post...');
  const pubRes = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button, span')).filter(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'publicar' || txt === 'post') && r.width > 0;
      });
      if (btns.length > 0) {
        const b = btns[btns.length - 1];
        b.click();
        return 'Clicked ' + b.textContent;
      }
      return null;
    })()`,
    returnByValue: true
  });
  console.log('Publish result:', pubRes.result?.value);
  console.log('   Waiting 15s for Facebook post completion...');
  await wait(15000);

  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_nat_03_POSTED_FINAL.png');
  ws.close();
  console.log('\n✅ Facebook Native Post Finished!');
}

main().catch(console.error);
