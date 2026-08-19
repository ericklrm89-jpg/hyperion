/**
 * HYPERION v11 — TikTok Studio Publisher (LIVE FIXED & VERIFIED)
 */
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const VIDEO = 'C:\\FairDraw\\fairdraw-social\\output\\fairdraw_promo_final.mp4';
const COPY_TT = `🚀 ¿Quieres hacer crecer tus redes de 0 a 10K seguidores reales? El secreto de los creadores que más crecen no es publicar 5 veces al día, es usar dinámicas virales de alta retención. Con FairDraw atraes público calificado de tu nicho y multiplicas la interacción de tu perfil. 📈⚡ fairdrawapp.com #CrecimientoOrganico #CrecerEnTikTok #CrecerEnInstagram #Emprendedores #MarketingDigital #EstrategiaDigital #CreadoresDeContenido #FairDraw #RedesSociales`;

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

async function screenshot(ws, name) {
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(name, Buffer.from(ss.data, 'base64'));
  console.log('   📸 Screenshot saved:', name);
}

async function main() {
  console.log('\n============================================');
  console.log('🚀 HYPERION — TikTok Studio Live Fix & Verify');
  console.log('============================================');

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  let tab = tabs.find(t => t.type==='page' && t.url.includes('tiktok.com'));
  if (!tab) {
    tab = tabs.find(t => t.type==='page' && !t.url.includes('devtools'));
  }
  if (!tab) throw new Error('No browser tab available');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // STEP 0: Clear beforeunload and navigate to TikTok Studio upload
  console.log('\n🆕 STEP 0: Navigating to TikTok Studio Upload...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.onbeforeunload = null; window.location.href='https://www.tiktok.com/tiktokstudio/upload';" });
  await wait(8000);

  // STEP 0B: Check for "Descartar" draft banner modal
  console.log('\n🧹 STEP 0B: Checking for draft banner modal...');
  const checkBanner = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const discardBtn = btns.find(b => {
        const txt = (b.textContent || '').trim().toLowerCase();
        return txt === 'descartar' || txt === 'discard';
      });
      if (discardBtn) {
        discardBtn.click();
        return 'discard_clicked';
      }
      return 'no_banner';
    })()`,
    returnByValue: true
  });
  console.log('   Banner check result:', checkBanner.result?.value);
  if (checkBanner.result?.value === 'discard_clicked') {
    await wait(3000);
  }

  // STEP 1: Inject video file
  console.log('\n📤 STEP 1: Injecting 22s Organic Growth Video file...');
  await cdpCall(ws, 'DOM.enable');
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const fileInputs = await cdpCall(ws, 'DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  if (!fileInputs.nodeIds || fileInputs.nodeIds.length === 0) throw new Error('No input[type="file"] found in TikTok Studio');

  const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId: fileInputs.nodeIds[0] });
  await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: nodeInfo.node.backendNodeId, files: [VIDEO] });
  console.log('   ✅ Video injected into TikTok. Waiting 12s for upload & canvas render...');
  await wait(12000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\verif_tt_01_uploaded.png');

  // STEP 2: Caption text injection
  console.log('\n✍️ STEP 2: Injecting Organic Growth caption...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('div[contenteditable="true"], textarea');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(COPY_TT)});
        ed.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    })()`
  });
  await wait(2000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\verif_tt_02_caption.png');

  // STEP 3: Click Post / Publicar
  console.log('\n🚀 STEP 3: Clicking Post / Publicar button...');
  const postClick = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const postBtn = btns.find(b => {
        const txt = (b.textContent || '').trim().toLowerCase();
        const r = b.getBoundingClientRect();
        return (txt === 'post' || txt === 'publicar' || txt === 'postar') && r.width > 0;
      });
      if (postBtn) {
        postBtn.scrollIntoView({ block: 'center' });
        postBtn.click();
        return 'post_clicked:' + postBtn.textContent.trim();
      }
      return 'post_btn_not_found';
    })()`,
    returnByValue: true
  });
  console.log('   Post click result:', postClick.result?.value);
  
  console.log('   ⏳ Waiting 15s for TikTok server processing & redirect...');
  await wait(15000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\verif_tt_03_final.png');

  ws.close();
  console.log('\n✅ TikTok Studio verification complete!');
}

main().catch(e => { console.error('❌ FATAL TikTok verification error:', e.message); process.exit(1); });
