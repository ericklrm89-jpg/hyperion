/**
 * HYPERION — Upload video in Facebook Create Reel modal
 * The modal "Create reel" is already open with "Add video" + "Upload" button visible
 */
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const VIDEO = 'C:\\FairDraw\\fairdraw-social\\output\\fairdraw_promo_final.mp4';
const CAPTION = `\u{1F680} \u00bfQuieres hacer crecer tus redes de 0 a 10K seguidores reales?

El secreto no es publicar m\u00e1s, es usar din\u00e1micas virales. Con FairDraw atraes p\u00fablico calificado y conviertes seguidores en clientes. \u{1F4C8}\u26A1

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
    let fileChooserCbId = null;

    ws.on('message', raw => {
      try {
        const msg = JSON.parse(raw);
        // File chooser event
        if (msg.method === 'Page.fileChooserOpened') {
          console.log('  File chooser opened! backendNodeId:', msg.params.backendNodeId);
          fileChooserCbId = msg.params.backendNodeId;
        }
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

    const click = async (x, y) => {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await new Promise(r => setTimeout(r, 80));
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await new Promise(r => setTimeout(r, 80));
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    };

    const screenshot = async (name) => {
      const ss = await send('Page.captureScreenshot', { format: 'png' }, 10000);
      fs.writeFileSync(OUT + name, Buffer.from(ss.data, 'base64'));
      console.log('  Screenshot:', name);
    };

    ws.on('open', async () => {
      try {
        await send('Page.enable');

        // Enable file chooser interception
        console.log('1. Enabling file chooser interception...');
        await send('Page.setInterceptFileChooserDialog', { enabled: true });

        // Click the Upload button at bottom of the modal (visible in screenshot at ~y=925)
        console.log('2. Clicking Upload button...');
        const uploadClicked = await send('Runtime.evaluate', {
          expression: `(() => {
            const btn = Array.from(document.querySelectorAll('div[role="button"], button, span')).find(e => {
              const txt = (e.textContent || '').trim().toLowerCase();
              const r = e.getBoundingClientRect();
              return (txt === 'upload' || txt === 'subir') && r.width > 50;
            });
            if (btn) {
              const r = btn.getBoundingClientRect();
              btn.click();
              return JSON.stringify({ txt: btn.textContent.trim(), x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2) });
            }
            return null;
          })()`
        });
        console.log('  Upload btn:', uploadClicked.result?.value);

        if (!uploadClicked.result?.value) {
          // Fallback: click "Add video" area at x=254, y=277
          console.log('  Fallback: clicking Add video area...');
          await click(254, 277);
        }

        // Wait for file chooser to open
        console.log('3. Waiting for file chooser...');
        const start = Date.now();
        while (!fileChooserCbId && Date.now() - start < 5000) {
          await new Promise(r => setTimeout(r, 300));
        }

        if (fileChooserCbId) {
          console.log('  Injecting video file via DOM.setFileInputFiles...');
          await send('DOM.setFileInputFiles', { backendNodeId: fileChooserCbId, files: [VIDEO] });
          console.log('  File injected!');
        } else {
          // Try finding file input directly
          console.log('  No chooser event - trying direct file input injection...');
          await send('DOM.enable');
          const evalResult = await send('Runtime.evaluate', {
            expression: `(() => {
              const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
              return JSON.stringify(inputs.map(i => i.accept));
            })()`
          });
          console.log('  File inputs found:', evalResult.result?.value);
        }

        console.log('4. Waiting 12s for video processing...');
        await new Promise(r => setTimeout(r, 12000));
        await screenshot('fb_reel_step4_video_processed.png');

        // Now click Next button
        console.log('5. Clicking Next...');
        const nextClicked = await send('Runtime.evaluate', {
          expression: `(() => {
            const btns = Array.from(document.querySelectorAll('div[role="button"], button')).filter(e => {
              const txt = (e.textContent || '').trim().toLowerCase();
              const r = e.getBoundingClientRect();
              return (txt === 'next' || txt === 'siguiente') && r.width > 80;
            });
            if (btns.length > 0) { const b = btns[btns.length-1]; b.click(); return b.textContent.trim(); }
            return null;
          })()`
        });
        console.log('  Next click:', nextClicked.result?.value);
        await new Promise(r => setTimeout(r, 4000));
        await screenshot('fb_reel_step5_edit_reel.png');

        // Click Next again (Edit reel → Reel settings)
        console.log('6. Clicking Next again (Reel settings)...');
        const nextClicked2 = await send('Runtime.evaluate', {
          expression: `(() => {
            const btns = Array.from(document.querySelectorAll('div[role="button"], button')).filter(e => {
              const txt = (e.textContent || '').trim().toLowerCase();
              const r = e.getBoundingClientRect();
              return (txt === 'next' || txt === 'siguiente') && r.width > 80;
            });
            if (btns.length > 0) { const b = btns[btns.length-1]; b.click(); return b.textContent.trim(); }
            return null;
          })()`
        });
        console.log('  Next 2:', nextClicked2.result?.value);
        await new Promise(r => setTimeout(r, 4000));
        await screenshot('fb_reel_step6_settings.png');

        // Write caption in description box
        console.log('7. Writing caption...');
        await send('Runtime.evaluate', {
          expression: `(() => {
            const ed = document.querySelector('div[contenteditable="true"], textarea');
            if (ed) {
              ed.focus();
              document.execCommand('selectAll', false, null);
              document.execCommand('insertText', false, ${JSON.stringify(CAPTION)});
              ed.dispatchEvent(new Event('input', { bubbles: true }));
              return 'Caption written';
            }
            return null;
          })()`
        });
        await new Promise(r => setTimeout(r, 1000));

        // Dismiss any hashtag popup
        await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape' });
        await new Promise(r => setTimeout(r, 500));
        await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape' });
        await new Promise(r => setTimeout(r, 1000));

        await screenshot('fb_reel_step7_caption_written.png');

        // Click Post
        console.log('8. Clicking Post / Publicar...');
        const postClicked = await send('Runtime.evaluate', {
          expression: `(() => {
            const btns = Array.from(document.querySelectorAll('div[role="button"], button')).filter(e => {
              const txt = (e.textContent || '').trim().toLowerCase();
              const r = e.getBoundingClientRect();
              return (txt === 'post' || txt === 'publicar') && r.width > 0;
            });
            if (btns.length > 0) { const b = btns[btns.length-1]; b.click(); return b.textContent.trim(); }
            return null;
          })()`
        });
        console.log('  Post click:', postClicked.result?.value);
        
        console.log('9. Waiting 15s for publication...');
        await new Promise(r => setTimeout(r, 15000));
        await screenshot('fb_reel_step8_PUBLISHED.png');

        ws.close();
        process.exit(0);
      } catch(e) {
        console.error('ERR:', e.message);
        // Try to screenshot current state
        try {
          const ss = await send('Page.captureScreenshot', { format: 'png' }, 5000);
          fs.writeFileSync(OUT + 'fb_reel_ERROR_STATE.png', Buffer.from(ss.data, 'base64'));
          console.log('Saved fb_reel_ERROR_STATE.png');
        } catch(_) {}
        process.exit(1);
      }
    });

    ws.on('error', e => { console.error('WS err:', e.message); process.exit(1); });
  });
});
