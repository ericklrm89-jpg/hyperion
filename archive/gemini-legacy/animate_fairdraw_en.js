/**
 * HYPERION v11 — Gemini Web Flow (ENGLISH - PRODUCTION)
 * Follows 100% SKILL.md gemini.md guidelines for English Video Generation
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');
const WebSocket = require('ws');

let cdpId = 1;
function cdpCall(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = cdpId++;
    const h = (data) => {
      try {
        const r = JSON.parse(data);
        if (r.id === id) {
          ws.removeListener('message', h);
          r.error ? reject(new Error(JSON.stringify(r.error))) : resolve(r.result || {});
        }
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

const MANUS = `(function(){
  try{if(window.__HYT){clearInterval(window.__HYT);}document.querySelectorAll('.HYL,.HYS').forEach(e=>e.remove());}catch(e){}
  var s=document.createElement('style');s.className='HYS';
  s.textContent='.HYL{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 10px/12px monospace;color:#fff;text-shadow:0 0 3px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;}';
  document.head.appendChild(s);
  var C=[{f:'rgba(255,0,0,.4)',b:'#F00'},{f:'rgba(0,200,0,.4)',b:'#0C0'},{f:'rgba(0,100,255,.4)',b:'#06F'},{f:'rgba(200,200,0,.4)',b:'#CC0'},{f:'rgba(200,0,200,.4)',b:'#C0C'},{f:'rgba(0,200,200,.4)',b:'#0CC'}];
  function vis(){var w=window.innerWidth,h=window.innerHeight,sel='button,a,input,textarea,[role="button"],[role="menuitem"],[contenteditable="true"]',all=Array.from(document.querySelectorAll(sel)),r=[];
    for(var i=0;i<all.length;i++){try{var el=all[i],rc=el.getBoundingClientRect();if(rc.width<12||rc.height<12||rc.right<0||rc.bottom<0||rc.left>w||rc.top>h)continue;var cx=Math.round(rc.left+rc.width/2),cy=Math.round(rc.top+rc.height/2);var aria=el.getAttribute('aria-label')||el.getAttribute('title')||'';var txt=(aria||el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,22);if(!txt)continue;r.push({el:el,rc:rc,txt:txt,cx:cx,cy:cy});}catch(e){}}return r;}
  function render(){try{document.querySelectorAll('.HYL').forEach(e=>e.remove());var els=vis();var info=document.createElement('div');info.className='HYL';info.style.cssText='top:3px;left:50%;transform:translateX(-50%);padding:3px 10px;background:rgba(0,0,0,.85);border-radius:4px;font:bold 12px monospace;color:#0f0;border:1px solid #0f0;white-space:nowrap;';info.textContent='HYPERION v11 ENGLISH ['+els.length+' | DINÁMICO 250ms]';document.body.appendChild(info);for(var i=0;i<els.length;i++){var e=els[i],c=C[i%C.length],d=document.createElement('div');d.className='HYL';d.style.cssText='left:'+e.rc.left+'px;top:'+e.rc.top+'px;width:'+e.rc.width+'px;height:'+e.rc.height+'px;background:'+c.f+';border:2px solid '+c.b+';';d.textContent='['+(i+1)+'] '+e.txt.slice(0,14);document.body.appendChild(d);}}catch(e){}}
  render(); window.__HYT=setInterval(render,250);
  window.addEventListener('resize',render); window.addEventListener('scroll',render,{passive:true});
})();`;

const ART = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea';
const FILES = [
  path.join(ART, 'fairdraw_storyboard_1_1785177902303.png'),
  path.join(ART, 'fairdraw_storyboard_2_1785177924996.png'),
  path.join(ART, 'fairdraw_storyboard_3_1785177945874.png')
];

FILES.forEach(f => {
  if (!fs.existsSync(f)) {
    console.error(`❌ English file missing: ${f}`);
    process.exit(1);
  }
});

const PROMPT_EN = "Animate these 3 uploaded marketing storyboard images for FairDraw giveaway app. Generate a high-energy 10-second vertical 9:16 promotional video suitable for Instagram Reels and TikTok. The animation should smoothly transition between these scenes, showing a trusted provably fair system. Include energetic English voiceover narration and synced on-screen dynamic captions (burned-in subtitles). Keep the official FairDraw logo consistent throughout.";

async function main() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('🚀 HYPERION v11 — Gemini English (PRODUCTION)');
  console.log('═══════════════════════════════════════════════');

  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ try { res(JSON.parse(d)); } catch(e) { rej(e); }});
    }).on('error',rej);
  });
  const tab = tabs.find(t => t.type==='page' && t.url.includes('gemini.google.com') && !t.url.includes('RotateCookies'));
  if (!tab) throw new Error('❌ No Gemini tab found in CDP');
  console.log('✅ Tab:', tab.url.slice(0, 60));

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.on('open', () => { console.log('✅ WebSocket CDP open.'); resolve(); });
    ws.on('error', (e) => reject(e));
  });

  await cdpCall(ws, 'Page.bringToFront');
  await cdpCall(ws, 'Page.enable');

  // STEP 0: New conversation
  console.log('\n🆕 STEP 0: Starting new conversation...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const links = Array.from(document.querySelectorAll('a,button'));
      const btn = links.find(e => (e.getAttribute('aria-label')||e.textContent||'').toLowerCase().includes('nuevo chat') || (e.getAttribute('aria-label')||e.textContent||'').toLowerCase().includes('new chat'));
      if(btn){ btn.click(); return 'clicked'; }
      window.onbeforeunload = null;
      window.location.href='https://gemini.google.com/app';
      return 'navigated';
    })()`
  });

  console.log('   ⏳ Waiting for editor hydration...');
  let editorReady = false;
  for (let i = 0; i < 24; i++) {
    const check = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `!!document.querySelector('div[contenteditable="true"], textarea')`
    });
    if (check.result?.value) { editorReady = true; break; }
    await wait(500);
  }
  if (!editorReady) throw new Error('❌ Editor failed to hydrate in time');
  console.log('   ✅ Editor ready. Waiting 3s for Angular handlers...');
  await wait(3000);

  // STEP 1: Dynamic Manus Layer
  console.log('\n🌐 STEP 1: [LAW #1] Injecting Dynamic Manus layer...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS });
  await wait(600);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\hy_01_manus_en.png');

  // STEP 2: Configure native file picker bypass
  console.log('\n🔒 STEP 2: Configuring native dialog bypass...');
  await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: true });
  await cdpCall(ws, 'Page.setDownloadBehavior', { behavior: 'allow', downloadPath: 'C:\\Users\\erick\\Downloads' });

  // STEP 3: Register fileChooserPromise BEFORE click
  console.log('\n🎣 STEP 3: Registering Page.fileChooserOpened listener BEFORE click...');
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
    setTimeout(() => { ws.removeListener('message', h); reject(new Error('Timeout: fileChooserOpened never fired (10s)')); }, 10000);
  });

  // STEP 4: Click (+) with dynamic DOM coords
  console.log('\n🔧 STEP 4: Clicking (+) button...');
  const plusCoords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('button')).find(b => {
        const a = (b.getAttribute('aria-label')||'').toLowerCase();
        return a === 'cargas y herramientas' || a === 'subidas y herramientas' || a === 'uploads and tools' || a === 'upload and tools';
      });
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return JSON.stringify({ x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2) });
    })()`,
    returnByValue: true
  });
  if (!plusCoords.result?.value) throw new Error('❌ Plus (+) button not found');
  const pc = JSON.parse(plusCoords.result.value);
  console.log(`   (+) Coords: x=${pc.x}, y=${pc.y}`);
  await mouseClick(ws, pc.x, pc.y);
  await wait(1500);

  // STEP 5: Click "Upload files"
  console.log('\n📂 STEP 5: Clicking "Upload files"...');
  let pUp = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    const upBtn = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button,[role="menuitem"],[role="option"]')).find(b => {
          const a = (b.getAttribute('aria-label')||'').toLowerCase();
          const t = (b.innerText||b.textContent||'').trim().toLowerCase();
          return a.startsWith('subir') || t === 'subir archivos' || t === 'upload files' || a.startsWith('upload files');
        });
        if (btn) {
          const r = btn.getBoundingClientRect();
          if (r.width > 0 && r.height > 0)
            return JSON.stringify({ x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2) });
        }
        return null;
      })()`, returnByValue: true
    });
    if (upBtn.result?.value) { pUp = JSON.parse(upBtn.result.value); break; }
    await wait(500);
  }
  if (!pUp) throw new Error('❌ "Upload files" not found in popup');
  console.log(`   "Upload files" Coords: x=${pUp.x}, y=${pUp.y}`);
  await mouseClick(ws, pUp.x, pUp.y);

  // STEP 6: Inject files via backendNodeId
  console.log('\n📤 STEP 6: Waiting for interception and injecting 3 English files...');
  const backendNodeId = await fileChooserPromise;
  await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId, files: FILES });
  await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: false });
  console.log('   ✅ 3 English images injected. Waiting for thumbnail render (6s)...');
  await wait(6000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\hy_03_archivos_en.png');

  // STEP 7: Type English prompt
  console.log('\n✍️ STEP 7: Injecting English prompt...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('div[contenteditable="true"],textarea');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(PROMPT_EN)});
        ed.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    })()`
  });
  await wait(1000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\hy_04_prompt_en.png');

  // STEP 8: Send message
  console.log('\n🚀 STEP 8: Sending prompt to Gemini...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('button')).find(b => {
        const a = (b.getAttribute('aria-label')||'').trim().toLowerCase();
        return a === 'enviar mensaje' || a === 'send message' || a === 'enviar' || a === 'send';
      });
      if(b) { b.click(); return 'clicked'; }
      return 'not found';
    })()`
  });

  console.log('\n✅ PROMPT SENT TO GEMINI. Waiting for video generation (90s)...');
  await wait(5000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\hy_05_generando_en.png');
  await wait(85000);

  // STEP 9: Download video
  console.log('\n⬇️ STEP 9: Searching for video download button...');
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\hy_06_video_listo_en.png');

  const dlPos = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('button,a')).find(b => {
        const a = (b.getAttribute('aria-label')||'').trim().toLowerCase();
        return a === 'descargar vídeo' || a === 'download video' || a.includes('descargar') || a.includes('download');
      });
      if(b){
        b.scrollIntoView({ block: 'center' });
        const r = b.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2) });
      }
      return null;
    })()`, returnByValue: true
  });

  if (dlPos.result?.value) {
    const p = JSON.parse(dlPos.result.value);
    await mouseClick(ws, p.x, p.y);
    await wait(3000);
    console.log('   ✅ English Video downloaded into C:\\Users\\erick\\Downloads!');
  } else {
    console.log('   ⚠️ Download button not found yet. Check hy_06_video_listo_en.png');
  }

  ws.close();
  console.log('\n✅ ═══════════════════════════════════════════════');
  console.log('   HYPERION v11 — English Gemini Flow COMPLETED');
  console.log('═══════════════════════════════════════════════\n');
}

main().catch(e => { console.error('❌ FATAL:', e.message); process.exit(1); });
