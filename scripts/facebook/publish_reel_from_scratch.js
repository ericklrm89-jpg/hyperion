/**
 * HYPERION — Publish Facebook Reel From Scratch
 * Approach: Use the Reels shortcut directly from facebook.com home
 */
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const VIDEO = 'C:\\FairDraw\\fairdraw-social\\output\\fairdraw_promo_final.mp4';
const CAPTION = `\u{1F680} \u00bfQuieres hacer crecer tus redes de 0 a 10K seguidores reales?

El secreto de los creadores que m\u00e1s crecen no es publicar 5 veces al d\u00eda, es usar din\u00e1micas virales de alta retenci\u00f3n. Con FairDraw atraes p\u00fablico calificado de tu nicho, multiplicas la interacci\u00f3n de tu perfil y conviertes espectadores en clientes fieles. \u{1F4C8}\u26A1

\u{1F310} fairdrawapp.com

#CrecimientoOrganico #CrecerEnInstagram #CrecerEnTikTok #Emprendedores #MarketingDigital #FairDraw`;

const OUT = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\';

http.get('http://127.0.0.1:9222/json', r => {
  let d = ''; r.on('data', c => d += c); r.on('end', () => {
    const tabs = JSON.parse(d);
    const fb = tabs.find(t => t.type === 'page' && t.url.includes('facebook'));
    if (!fb) return console.error('No FB tab');

    const ws = new WebSocket(fb.webSocketDebuggerUrl);
    let msgId = 1;
    const pending = new Map();

    ws.on('message', raw => {
      try {
        const msg = JSON.parse(raw);
        if (msg.id && pending.has(msg.id)) {
          const { res, t } = pending.get(msg.id);
          clearTimeout(t); pending.delete(msg.id); res(msg.result || {});
        }
      } catch(e) {}
    });

    const send = (method, params, ms) => new Promise((res, rej) => {
      const id = msgId++;
      const t = setTimeout(() => { pending.delete(id); rej(new Error(method + ' timeout')); }, ms || 15000);
      pending.set(id, { res, t });
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });

    let loadFired = false;
    ws.on('message', raw => {
      try {
        const msg = JSON.parse(raw);
        if (msg.method === 'Page.loadEventFired') loadFired = true;
      } catch(e) {}
    });

    const waitLoad = async (maxMs) => {
      loadFired = false;
      const deadline = Date.now() + (maxMs || 15000);
      while (!loadFired && Date.now() < deadline) await new Promise(r => setTimeout(r, 300));
    };

    const screenshot = async (name) => {
      const ss = await send('Page.captureScreenshot', { format: 'png' }, 10000);
      fs.writeFileSync(OUT + name, Buffer.from(ss.data, 'base64'));
      console.log('  Screenshot:', name);
    };

    ws.on('open', async () => {
      try {
        await send('Page.enable');

        // Navigate to facebook home
        console.log('1. Navigating to facebook.com home...');
        send('Page.navigate', { url: 'https://www.facebook.com/' }).catch(() => {});
        await waitLoad(15000);
        await new Promise(r => setTimeout(r, 3000));
        await screenshot('fb_reel_step1_home.png');

        // Click on Reels in sidebar
        console.log('2. Clicking Reels link in sidebar...');
        const reelLink = await send('Runtime.evaluate', {
          expression: `(() => {
            const el = Array.from(document.querySelectorAll('a, span, div')).find(e => {
              const txt = (e.textContent || '').trim().toLowerCase();
              const r = e.getBoundingClientRect();
              return txt === 'reels' && r.width > 0 && r.y > 50;
            });
            if (el) { el.click(); return 'clicked'; }
            return null;
          })()`
        });
        console.log('  Reels click:', reelLink.result?.value);
        await new Promise(r => setTimeout(r, 3000));

        // Look for Create Reel button
        console.log('3. Looking for Create Reel button...');
        const createBtn = await send('Runtime.evaluate', {
          expression: `(() => {
            const selectors = ['a[href*="reels/create"]', 'div[aria-label*="Create reel"]', 'div[aria-label*="Crear reel"]'];
            for(const sel of selectors) {
              const el = document.querySelector(sel);
              if(el) { el.click(); return 'Found: ' + sel; }
            }
            const btn = Array.from(document.querySelectorAll('div[role="button"], a')).find(e => {
              const txt = (e.textContent || '').toLowerCase();
              const r = e.getBoundingClientRect();
              return (txt.includes('create reel') || txt.includes('crear reel')) && r.width > 0;
            });
            if(btn) { btn.click(); return 'Clicked: ' + btn.textContent.trim(); }
            return null;
          })()`
        });
        console.log('  Create reel:', createBtn.result?.value);

        if (!createBtn.result?.value) {
          // Fallback: navigate directly to Reels create page
          console.log('  Fallback: navigate to reels/create...');
          send('Page.navigate', { url: 'https://www.facebook.com/reels/create' }).catch(() => {});
          await new Promise(r => setTimeout(r, 6000));
        } else {
          await new Promise(r => setTimeout(r, 4000));
        }

        await screenshot('fb_reel_step2_create_page.png');

        // Upload video file
        console.log('4. Uploading video file...');
        const doc = await send('DOM.getDocument', { depth: -1, pierce: true });
        const fileInputs = await send('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
        
        let uploaded = false;
        if (fileInputs.nodeIds && fileInputs.nodeIds.length > 0) {
          for (const nodeId of fileInputs.nodeIds) {
            const nodeInfo = await send('DOM.describeNode', { nodeId });
            await send('DOM.setFileInputFiles', { backendNodeId: nodeInfo.node.backendNodeId, files: [VIDEO] });
          }
          console.log('  Video file injected');
          uploaded = true;
        }

        if (!uploaded) {
          // Try clicking upload button
          console.log('  Clicking upload button...');
          await send('Runtime.evaluate', {
            expression: `(() => {
              const btn = Array.from(document.querySelectorAll('div[role="button"], button')).find(e => {
                const txt = (e.textContent || '').toLowerCase();
                const r = e.getBoundingClientRect();
                return (txt.includes('upload') || txt.includes('subir') || txt.includes('select video')) && r.width > 0;
              });
              if(btn) { btn.click(); return 'clicked'; }
              return null;
            })()`
          });
          await new Promise(r => setTimeout(r, 2000));
          const doc2 = await send('DOM.getDocument', { depth: -1, pierce: true });
          const fileInputs2 = await send('DOM.querySelectorAll', { nodeId: doc2.root.nodeId, selector: 'input[type="file"]' });
          if (fileInputs2.nodeIds && fileInputs2.nodeIds.length > 0) {
            for (const nodeId of fileInputs2.nodeIds) {
              const nodeInfo = await send('DOM.describeNode', { nodeId });
              await send('DOM.setFileInputFiles', { backendNodeId: nodeInfo.node.backendNodeId, files: [VIDEO] });
            }
            console.log('  Video file injected (fallback)');
          }
        }

        console.log('  Waiting 10s for video processing...');
        await new Promise(r => setTimeout(r, 10000));
        await screenshot('fb_reel_step3_video_uploaded.png');

        ws.close();
        process.exit(0);
      } catch(e) {
        console.error('ERR:', e.message);
        process.exit(1);
      }
    });

    ws.on('error', e => { console.error('WS err:', e.message); process.exit(1); });
  });
});
