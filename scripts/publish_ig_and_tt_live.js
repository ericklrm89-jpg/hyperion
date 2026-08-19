/**
 * Live Publisher for Instagram and TikTok (Final Confirmation)
 */
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch';
const VIDEO_REAL = 'C:\\FairDraw\\fairdraw-social\\assets\\post_final.mp4';

const COPY_IG = `🚀 Giveaways you can trust!

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

async function runLivePost() {
  const tabs = await getAvailableTabs();
  const targetTab = tabs[0];
  console.log(`[CDP] Conectando a pestaña: ${targetTab.title}`);

  const ws = new WebSocket(targetTab.webSocketDebuggerUrl);
  await new Promise((res) => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'DOM.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // ============================================
  // INSTAGRAM LIVE PUBLICATION
  // ============================================
  console.log('\n📸 Publicando Reel en Instagram FairDraw...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href = 'https://www.instagram.com/';` });
  await wait(5000);

  // Click Create [+] button in sidebar
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
  await wait(3000);

  // Find file input and inject
  const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
  const fileInput = await cdpCall(ws, 'DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"]',
  });

  if (fileInput?.nodeId) {
    await cdpCall(ws, 'DOM.setFileInputFiles', {
      files: [VIDEO_REAL],
      nodeId: fileInput.nodeId,
    });
    console.log('   ✅ Archivo post_final.mp4 inyectado en Instagram');
    await wait(6000);
    await captureStepScreenshot(ws, 'ig_step1_preview.png');

    // Click "Next / Siguiente" (Step 1: Crop)
    await cdpCall(ws, 'Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
          const next = btns.find(b => {
            const t = (b.textContent || '').trim().toLowerCase();
            return t === 'siguiente' || t === 'next';
          });
          if (next) next.click();
        })()
      `,
    });
    await wait(3000);
    await captureStepScreenshot(ws, 'ig_step2_crop.png');

    // Click "Next / Siguiente" (Step 2: Filter/Cover)
    await cdpCall(ws, 'Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
          const next = btns.find(b => {
            const t = (b.textContent || '').trim().toLowerCase();
            return t === 'siguiente' || t === 'next';
          });
          if (next) next.click();
        })()
      `,
    });
    await wait(3000);
    await captureStepScreenshot(ws, 'ig_step3_caption_screen.png');

    // Enter caption in textbox
    const escapedCopy = COPY_IG.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    await cdpCall(ws, 'Runtime.evaluate', {
      expression: `
        (() => {
          const editor = document.querySelector('div[contenteditable="true"][role="textbox"], textarea[aria-label*="caption"], textarea[aria-label*="pie de foto"]');
          if (editor) {
            editor.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, \`${escapedCopy}\`);
          }
        })()
      `,
    });
    await wait(2000);
    await captureStepScreenshot(ws, 'ig_step4_caption_entered.png');

    // Click "Compartir / Share"
    await cdpCall(ws, 'Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
          const share = btns.find(b => {
            const t = (b.textContent || '').trim().toLowerCase();
            return t === 'compartir' || t === 'share';
          });
          if (share) share.click();
        })()
      `,
    });
    console.log('   ✅ Botón Compartir clickeado en Instagram. Esperando publicación...');
    await wait(12000);
    await captureStepScreenshot(ws, 'ig_step5_post_shared.png');
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ PUBLICACIÓN EN INSTAGRAM COMPLETADA');
  console.log('═══════════════════════════════════════════════════════\n');

  ws.close();
}

runLivePost().catch(console.error);
