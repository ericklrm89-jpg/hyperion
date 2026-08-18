/**
 * HYPERION v11 — Instagram Reels Publisher (ENGLISH - CLEAN FRESH MODAL)
 */
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const COPY_IG = `🚀 How to gain 10K real followers and scale your social reach fast!

The top creators aren't just posting randomly—they use high-retention growth strategies to explode their engagement. FairDraw helps you attract qualified followers in your exact niche, boost account reach, and turn viewers into loyal fans. 📈⚡

🌐 fairdrawapp.com

#SocialMediaGrowth #OrganicGrowth #ContentCreator #GrowOnTikTok #GrowOnInstagram #DigitalMarketing #FairDraw #CreatorEconomy #SocialMediaStrategy`;

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

const MANUS = `(function(){
  try{if(window.__HYT){clearInterval(window.__HYT);}document.querySelectorAll('.HYL,.HYS').forEach(e=>e.remove());}catch(e){}
  var s=document.createElement('style');s.className='HYS';
  s.textContent='.HYL{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 10px/12px monospace;color:#fff;text-shadow:0 0 3px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;}';
  document.head.appendChild(s);
  var C=[{f:'rgba(255,0,0,.4)',b:'#F00'},{f:'rgba(0,200,0,.4)',b:'#0C0'},{f:'rgba(0,100,255,.4)',b:'#06F'},{f:'rgba(200,200,0,.4)',b:'#CC0'}];
  function vis(){var w=window.innerWidth,h=window.innerHeight,sel='button,a,input,textarea,[role="button"],[role="menuitem"],[contenteditable="true"]',all=Array.from(document.querySelectorAll(sel)),r=[];
    for(var i=0;i<all.length;i++){try{var el=all[i],rc=el.getBoundingClientRect();if(rc.width<12||rc.height<12||rc.right<0||rc.bottom<0||rc.left>w||rc.top>h)continue;var aria=el.getAttribute('aria-label')||el.getAttribute('title')||'';var txt=(aria||el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,22);if(!txt)continue;r.push({el:el,rc:rc,txt:txt});}catch(e){}}return r;}
  function render(){try{document.querySelectorAll('.HYL').forEach(e=>e.remove());var els=vis();var info=document.createElement('div');info.className='HYL';info.style.cssText='top:3px;left:50%;transform:translateX(-50%);padding:3px 10px;background:rgba(0,0,0,.85);border-radius:4px;font:bold 12px monospace;color:#0f0;border:1px solid #0f0;white-space:nowrap;';info.textContent='HYPERION v11 INSTAGRAM EN ['+els.length+' | 250ms]';document.body.appendChild(info);for(var i=0;i<els.length;i++){var e=els[i],c=C[i%C.length],d=document.createElement('div');d.className='HYL';d.style.cssText='left:'+e.rc.left+'px;top:'+e.rc.top+'px;width:'+e.rc.width+'px;height:'+e.rc.height+'px;background:'+c.f+';border:2px solid '+c.b+';';d.textContent='['+(i+1)+'] '+e.txt.slice(0,14);document.body.appendChild(d);}}catch(e){}}
  render(); window.__HYT=setInterval(render,250);
  window.addEventListener('resize',render); window.addEventListener('scroll',render,{passive:true});
})();`;

async function main() {
  console.log('\n════════════════════════════════════════════');
  console.log('🚀 HYPERION v11 — Instagram Reels English (CLEAN FLOW)');
  console.log('════════════════════════════════════════════');

  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  let tab = tabs.find(t => t.type==='page' && t.url.includes('instagram.com'));
  if (!tab) {
    tab = tabs.find(t => t.type==='page' && !t.url.includes('devtools'));
  }
  console.log('✅ Tab Target:', tab.url.slice(0,60));

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // STEP 0: Clean reload profile
  console.log('\n🆕 STEP 0: Navigating & resetting Instagram page...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.location.href='https://www.instagram.com/fairdrawapp/';" });
  await wait(6000);

  // STEP 1: Manus
  console.log('\n🌐 STEP 1: Injecting Manus layer...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS });
  await wait(600);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_01_perfil_en.png');

  // STEP 2: Click sidebar "New post / Create"
  console.log('\n➕ STEP 2: Clicking "New post / Create" button in sidebar...');
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

  // STEP 3: Inject file via CDP + dispatch change/input
  console.log('\n📤 STEP 3: Injecting English video into input[type=file]...');
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

  console.log('   ✅ Video injected! Waiting 8s for preview & canvas render...');
  await wait(8000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_03_video_en.png');

  // STEP 4-5: Click Siguiente -> Siguiente
  console.log('\n▶️ STEP 4-5: Clicking Siguiente / Next...');
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
      console.log(`   Next ${step} at x=${p.x}, y=${p.y}`);
      await mouseClick(ws, p.x, p.y);
      await wait(3000);
    }
  }

  // STEP 6: Write English caption
  console.log('\n✍️ STEP 6: Writing English caption...');
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

  // STEP 7: Share Reel
  console.log('\n🚀 STEP 7: Sharing Reel...');
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
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_06_publicado_en.png');

  ws.close();
  console.log('\n✅ Instagram Reel (English) PUBLISHED!');
}

main().catch(e => { console.error('❌ FATAL:', e.message); process.exit(1); });
