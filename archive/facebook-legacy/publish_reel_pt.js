/**
 * HYPERION v11 — Facebook Reels Publisher (Português)
 */
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const COPY_FB = `🚀 Quer fazer suas redes sociais crescerem e atrair milhares de seguidores reais?

O segredo dos criadores que mais crescem é usar dinâmicas virais de alta retenção. Com o FairDraw você atrai público qualificado no seu nicho, multiplica o engajamento do seu perfil e transforma visualizações em clientes fiéis. 📈⚡

🌐 fairdrawapp.com

#CrescimentoOrganico #CrescerNoInstagram #CrescerNoTikTok #MarketingDigital #CriadoresDeConteudo #Empreendedorismo #FairDraw #RedesSociais #Brasil`;

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
  console.log('🚀 HYPERION v11 — Facebook Reels Português');
  console.log('════════════════════════════════════════════');

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  let tab = tabs.find(t => t.type==='page' && t.url.includes('facebook.com'));
  if (!tab) {
    tab = tabs.find(t => t.type==='page' && !t.url.includes('devtools'));
  }
  if (!tab) throw new Error('No browser tab available');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // STEP 0: Navigate to Facebook Reels Creator
  console.log('\n🆕 STEP 0: Navigating to Facebook Reels Creator...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.location.href='https://www.facebook.com/reels/create';" });
  console.log('   ⏳ Waiting 12s for Facebook React DOM hydration...');
  await wait(12000);

  // STEP 1: Inject video via CDP
  console.log('\n📤 STEP 1: Injecting Portuguese video file...');
  await cdpCall(ws, 'DOM.enable');
  const doc = await cdpCall(ws, 'DOM.getDocument');
  const fileInputs = await cdpCall(ws, 'DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  if (!fileInputs.nodeIds || fileInputs.nodeIds.length === 0) throw new Error('No input[type="file"] found in Facebook');

  const targetNodeId = fileInputs.nodeIds[0];
  const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId: targetNodeId });
  const backendNodeId = nodeInfo.node.backendNodeId;

  await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId, files: [VIDEO] });
  console.log('   ✅ Portuguese Video injected. Waiting for upload & draft render (10s)...');
  await wait(10000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_pt_cargado.png');

  // STEP 2A: Click Next (Screen 1 → 2: Upload → Preview/Trim)
  console.log('\n▶️ STEP 2A: Clicking Next (Upload → Preview)...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      const target = btns.find(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'siguiente' || txt === 'next' || txt === 'avançar') && r.width > 0;
      });
      if (target) { target.click(); return 'clicked:' + target.textContent.trim(); }
      return 'not_found';
    })()`
  });
  await wait(4000);

  // STEP 2B: Click Next again (Screen 2 → 3: Preview/Trim → Caption+Publish)
  console.log('\n▶️ STEP 2B: Clicking Next (Preview → Caption)...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      const target = btns.find(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'siguiente' || txt === 'next' || txt === 'avançar') && r.width > 0;
      });
      if (target) { target.click(); return 'clicked:' + target.textContent.trim(); }
      return 'not_found';
    })()`
  });
  await wait(4000);

  // STEP 3: Caption text injection
  console.log('\n✍️ STEP 3: Writing Portuguese caption...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('div[contenteditable="true"], textarea');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(COPY_FB)});
        ed.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    })()`
  });
  await wait(2000);

  // STEP 4: Click Publish / Publicar
  console.log('\n🚀 STEP 4: Clicking Publish button...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      const target = btns.find(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'publicar' || txt === 'publish' || txt === 'post' || txt === 'publicar') && r.width > 0;
      });
      if (target) target.click();
    })()`
  });
  await wait(10000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_pt_publicado.png');

  ws.close();
  console.log('\n✅ Facebook Reels (Português) PUBLISHED!');
}

main().catch(e => { console.error('❌ FATAL Facebook PT:', e.message); process.exit(1); });
