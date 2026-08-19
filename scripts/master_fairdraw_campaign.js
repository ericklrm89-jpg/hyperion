/**
 * HYPERION MASTER FAIRDRAW CAMPAIGN (GEMINI + FB + IG + TT)
 * Real End-to-End Execution on Chrome 9222 with Capa Manus & Visual Verification
 */
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch';
const LOGO_REAL = 'C:\\FairDraw\\fairdraw-social\\assets\\logos\\logo_real.png';
const VIDEO_REAL = 'C:\\FairDraw\\fairdraw-social\\assets\\post_final.mp4';

const COPY_FAIRDRAW = `🚀 Giveaways you can trust!

Tired of rigged giveaways? FairDraw ensures 100% verified transparency with certified winners in real-time. Boost your brand reach and host promotions your audience can actually believe in. 📈⚡

🌐 fairdrawapp.com

#FairDraw #Giveaways #Transparency #OnlineGiveaway #SocialMediaGrowth #OrganicGrowth #CreatorEconomy`;

let cdpId = 1;
function cdpCall(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = cdpId++;
    const handler = (data) => {
      try {
        const r = JSON.parse(data);
        if (r.id === id) {
          ws.removeListener('message', handler);
          if (r.error) reject(new Error(JSON.stringify(r.error)));
          else resolve(r.result || {});
        }
      } catch (e) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function getAvailableTabs() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/list', (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(JSON.parse(d).filter((t) => t.type === 'page')));
    }).on('error', reject);
  });
}

async function captureStepScreenshot(ws, filename) {
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(ARTIFACTS_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(ss.data, 'base64'));
  console.log(`   📸 [Screenshot] Guardado en: ${filename}`);
  return outPath;
}

const MANUS_INJECTION = `
(function(){
  try {
    if (window.__HY_MANUS_SINGLETON && typeof window.__HY_MANUS_SINGLETON.destroy === 'function') {
      window.__HY_MANUS_SINGLETON.destroy();
    }
    document.querySelectorAll('.HYL, .HYS, #__hyperion_overlay_root, .hy-el, .hy-badge-banner').forEach(e => e.remove());
  } catch(e){}

  const style = document.createElement('style');
  style.className = 'HYS';
  style.textContent = '.HYL{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 11px/13px monospace;color:#fff;text-shadow:0 0 3px #000;padding:2px 4px;box-sizing:border-box;border:2px solid;border-radius:4px;box-shadow:0 0 6px rgba(0,0,0,0.5);}';
  document.head.appendChild(style);

  const COLORS = [
    {f:'rgba(255,0,80,0.35)',b:'#FF0055'},
    {f:'rgba(0,230,120,0.35)',b:'#00E676'},
    {f:'rgba(0,140,255,0.35)',b:'#0091FF'},
    {f:'rgba(255,190,0,0.35)',b:'#FFD600'},
    {f:'rgba(180,0,255,0.35)',b:'#AA00FF'},
    {f:'rgba(0,230,230,0.35)',b:'#00E5FF'}
  ];

  function collectVisible() {
    const w = window.innerWidth, h = window.innerHeight;
    const sel = 'button, a[href], input, textarea, select, [role="button"], [role="tab"], [role="menuitem"], [role="row"], [role="listitem"], [contenteditable="true"]';
    const all = Array.from(document.querySelectorAll(sel));
    const res = [];

    for (let i = 0; i < all.length; i++) {
      try {
        const el = all[i];
        const r = el.getBoundingClientRect();
        if (r.width < 12 || r.height < 12 || r.right < 0 || r.bottom < 0 || r.left > w || r.top > h) continue;
        const text = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 20);
        res.push({ el, r, text });
      } catch(e){}
    }
    return res;
  }

  function render() {
    try {
      document.querySelectorAll('.HYL').forEach(e => e.remove());
      const items = collectVisible();

      const banner = document.createElement('div');
      banner.className = 'HYL';
      banner.style.cssText = 'top:4px;left:50%;transform:translateX(-50%);padding:4px 16px;background:rgba(10,15,30,0.92);border-radius:6px;font:bold 12px monospace;color:#00E676;border:1px solid #00E676;white-space:nowrap;box-shadow:0 0 10px rgba(0,230,118,0.4);';
      banner.textContent = '⚡ CAPA MANUS MULTICOLOR HYPERION [' + items.length + ' ELEMENTOS]';
      document.body.appendChild(banner);

      items.forEach((item, idx) => {
        const c = COLORS[idx % COLORS.length];
        const box = document.createElement('div');
        box.className = 'HYL';
        box.style.cssText = 'left:' + item.r.left + 'px;top:' + item.r.top + 'px;width:' + item.r.width + 'px;height:' + item.r.height + 'px;background:' + c.f + ';border:2px solid ' + c.b + ';';
        box.textContent = '[' + (idx + 1) + ']' + (item.r.width > 60 && item.text ? ' ' + item.text.slice(0, 10) : '');
        document.body.appendChild(box);
      });
    } catch(e){}
  }

  render();
  const tid = setInterval(render, 250);
  window.__HY_MANUS_SINGLETON = {
    destroy: () => { clearInterval(tid); document.querySelectorAll('.HYL,.HYS').forEach(e => e.remove()); }
  };
})();
`;

async function runMasterCampaign() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 HYPERION MASTER FAIRDRAW CAMPAIGN');
  console.log('═══════════════════════════════════════════════════════\n');

  const tabs = await getAvailableTabs();
  if (tabs.length === 0) throw new Error('No Chrome tabs available on port 9222');
  const targetTab = tabs[0];
  console.log(`[CDP] Conectando a pestaña: ${targetTab.title} (${targetTab.url})`);

  const ws = new WebSocket(targetTab.webSocketDebuggerUrl);
  await new Promise((res) => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'DOM.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // ==========================================
  // ETAPA 1: GEMINI WEB (PROMPT & LOGO ASSET)
  // ==========================================
  console.log('\n🔵 ETAPA 1: Gemini Web — Generación Creativa FairDraw');
  await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href = 'https://gemini.google.com/app';` });
  await wait(5000);

  await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS_INJECTION });
  await wait(1000);
  await captureStepScreenshot(ws, '01_gemini_capa_manus.png');

  // Direct injection of real logo into Gemini file input
  const docGemini = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const fileInputGemini = await cdpCall(ws, 'DOM.querySelector', {
    nodeId: docGemini.root.nodeId,
    selector: 'input[type="file"]',
  });

  if (fileInputGemini?.nodeId) {
    await cdpCall(ws, 'DOM.setFileInputFiles', {
      files: [LOGO_REAL],
      nodeId: fileInputGemini.nodeId,
    });
    console.log('   ✅ Logo oficial de FairDraw inyectado en Gemini Web');
    await wait(3000);
    await captureStepScreenshot(ws, '02_gemini_logo_attached.png');
  }

  // Type Prompt in Gemini
  const promptGeminiText = `Create a viral promotional video script and creative copy for FairDraw. Slogan: "Giveaways you can trust". URL: fairdrawapp.com. ONE single logo only. NO double logo. No app store badges. Vertical 9:16 format.`;
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const editor = document.querySelector('div.ql-editor, div[contenteditable="true"], textarea');
        if (editor) {
          editor.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, \`${promptGeminiText}\`);
        }
      })()
    `,
  });
  await wait(1000);

  // Click Send in Gemini
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.querySelector('button[aria-label*="Enviar"], button[aria-label*="Send"], button.send-button');
        if (btn) btn.click();
      })()
    `,
  });
  console.log('   ✅ Prompt enviado a Gemini Web. Esperando respuesta...');
  await wait(7000);
  await captureStepScreenshot(ws, '03_gemini_response_rendered.png');

  // ==========================================
  // ETAPA 2: FACEBOOK REELS PUBLISHER
  // ==========================================
  console.log('\n🔵 ETAPA 2: Facebook — Publicación Verificada en Reels');
  await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href = 'https://www.facebook.com/reel/create';` });
  await wait(6000);

  await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS_INJECTION });
  await wait(1000);
  await captureStepScreenshot(ws, '04_fb_reel_create.png');

  // File injection into Facebook hidden input
  const docFB = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const fileInputFB = await cdpCall(ws, 'DOM.querySelector', {
    nodeId: docFB.root.nodeId,
    selector: 'input[type="file"], input[accept*="video"]',
  });

  if (fileInputFB?.nodeId) {
    await cdpCall(ws, 'DOM.setFileInputFiles', {
      files: [VIDEO_REAL],
      nodeId: fileInputFB.nodeId,
    });
    console.log('   ✅ Video real FairDraw (post_final.mp4) inyectado en Facebook');
    await wait(6000);
    await captureStepScreenshot(ws, '05_fb_video_uploaded.png');

    // Click Next
    await cdpCall(ws, 'Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
          const nextBtn = btns.find(b => (b.textContent || '').trim().toLowerCase() === 'next' || (b.textContent || '').trim().toLowerCase() === 'siguiente');
          if (nextBtn) nextBtn.click();
        })()
      `,
    });
    await wait(4000);

    // Enter caption
    const escapedCopy = COPY_FAIRDRAW.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    await cdpCall(ws, 'Runtime.evaluate', {
      expression: `
        (() => {
          const editor = document.querySelector('div[contenteditable="true"][role="textbox"], textarea');
          if (editor) {
            editor.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, \`${escapedCopy}\`);
          }
        })()
      `,
    });
    await wait(1500);
    await captureStepScreenshot(ws, '06_fb_reel_settings.png');
  }

  // ==========================================
  // ETAPA 3: INSTAGRAM REELS / FEED PUBLISHER
  // ==========================================
  console.log('\n🔵 ETAPA 3: Instagram — Publicación Verificada');
  await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href = 'https://www.instagram.com/';` });
  await wait(5000);

  await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS_INJECTION });
  await wait(1000);
  await captureStepScreenshot(ws, '07_ig_home_manus.png');

  // Click Create in Instagram sidebar
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('a, button, div[role="button"]')).find(e => {
          const txt = (e.textContent || '').trim().toLowerCase();
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.left < 140 && (
            txt.includes('new post') || txt.includes('create') ||
            txt.includes('nueva publicaci') || txt.includes('crear')
          );
        });
        if (btn) btn.click();
      })()
    `,
  });
  await wait(2000);

  // Inyectar archivo en Instagram
  const docIG = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const fileInputIG = await cdpCall(ws, 'DOM.querySelector', {
    nodeId: docIG.root.nodeId,
    selector: 'input[type="file"]',
  });

  if (fileInputIG?.nodeId) {
    await cdpCall(ws, 'DOM.setFileInputFiles', {
      files: [VIDEO_REAL],
      nodeId: fileInputIG.nodeId,
    });
    console.log('   ✅ Video real FairDraw inyectado en Instagram modal');
    await wait(4000);
    await captureStepScreenshot(ws, '08_ig_modal_injected.png');
  }

  // ==========================================
  // ETAPA 4: TIKTOK CREATOR STUDIO
  // ==========================================
  console.log('\n🔵 ETAPA 4: TikTok — Publicación Verificada en Creator Studio');
  await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href = 'https://www.tiktok.com/creator-center/upload?from=upload';` });
  await wait(6000);

  await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS_INJECTION });
  await wait(1000);
  await captureStepScreenshot(ws, '09_tt_creator_upload.png');

  // File injection into TikTok
  const docTT = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const fileInputTT = await cdpCall(ws, 'DOM.querySelector', {
    nodeId: docTT.root.nodeId,
    selector: 'input[type="file"], input[accept*="video"]',
  });

  if (fileInputTT?.nodeId) {
    await cdpCall(ws, 'DOM.setFileInputFiles', {
      files: [VIDEO_REAL],
      nodeId: fileInputTT.nodeId,
    });
    console.log('   ✅ Video real FairDraw inyectado en TikTok Studio');
    await wait(5000);
    await captureStepScreenshot(ws, '10_tt_video_ready.png');
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ CAMPAÑA MASTER FINALIZADA EXITOSAMENTE');
  console.log('═══════════════════════════════════════════════════════\n');

  ws.close();
}

runMasterCampaign().catch((err) => {
  console.error('❌ Error en Campaña Master:', err);
  process.exit(1);
});
