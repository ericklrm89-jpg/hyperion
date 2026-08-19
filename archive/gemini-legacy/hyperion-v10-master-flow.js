/**
 * HYPERION v10 CORRECTED — Gemini Web Master Flow
 * Aplicando lecciones del SKILL.md:
 * - (+) = aria-label "Subidas y herramientas" (exacto)
 * - input[type=file] solo existe DESPUÉS de click en "Subir archivos"
 * - DOM.setFileInputFiles dentro de 200ms del click en "Subir archivos"
 * - Capa Manus dinámica con setInterval 250ms
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');
const WebSocket = require('ws');

// ══ CDP Engine ════════════════════════════════════════════════════
function cdpCall(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 999999);
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

// ══ Mouse Click Real CDP ══════════════════════════════════════════
async function mouseClick(ws, x, y) {
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

// ══ Capa Manus Dinámica (setInterval 250ms) ════════════════════════
const MANUS_SCRIPT = `
(function(){
  try { if(window.__HY_SINGLE_TIMER){clearInterval(window.__HY_SINGLE_TIMER);} document.querySelectorAll('.hy-rr,.hy-st').forEach(e=>e.remove()); window.__HY_KILL_ALL=false; } catch(e){}
  var s=document.createElement('style'); s.className='hy-st';
  s.textContent='.hy-rr{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 11px/13px monospace;color:#fff;text-shadow:0 0 3px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;}';
  document.head.appendChild(s);
  var C=[{f:'rgba(255,0,0,.4)',b:'#F00'},{f:'rgba(0,200,0,.4)',b:'#0C0'},{f:'rgba(0,100,255,.4)',b:'#06F'},{f:'rgba(200,200,0,.4)',b:'#CC0'},{f:'rgba(200,0,200,.4)',b:'#C0C'},{f:'rgba(0,200,200,.4)',b:'#0CC'},{f:'rgba(255,128,0,.4)',b:'#F80'},{f:'rgba(128,0,255,.4)',b:'#80F'}];
  function gDE(root){root=root||document;var s='button,a,input,textarea,[role="button"],[role="menuitem"],[contenteditable="true"]';var els=Array.from(root.querySelectorAll(s));Array.from(root.querySelectorAll('*')).forEach(function(n){if(n.shadowRoot)els=els.concat(gDE(n.shadowRoot));});return els;}
  function gAL(){var w=window.innerWidth,h=window.innerHeight,all=gDE(document),vis=[];for(var i=0;i<all.length;i++){try{var el=all[i],r=el.getBoundingClientRect();if(r.width<12||r.height<12||r.right<0||r.bottom<0||r.left>w||r.top>h)continue;var cx=Math.round(r.left+r.width/2),cy=Math.round(r.top+r.height/2);if(cx<0||cy<0||cx>=w||cy>=h)continue;var at=document.elementsFromPoint(cx,cy);if(!at||!at.length)continue;var top=at[0],onTop=(top===el||el.contains(top));if(!onTop){var p=top;for(var j=0;j<15;j++){if(p===el){onTop=true;break;}if(!p||p===document.body)break;p=p.parentElement||(p.getRootNode?p.getRootNode().host:null);}}if(!onTop)continue;var aria=el.getAttribute('aria-label')||el.getAttribute('title')||'';var txt=aria||el.textContent||'';txt=txt.replace(/[\\u200b-\\u200f]/g,'').replace(/\\s+/g,' ').trim().slice(0,20);if(!txt)continue;vis.push({el:el,rect:r,text:txt,cx:cx,cy:cy});}catch(e){}}return{type:'VISIBLE',elements:vis};}
  function render(){try{document.querySelectorAll('.hy-rr').forEach(e=>e.remove());var layer=gAL(),els=layer.elements||[];var info=document.createElement('div');info.className='hy-rr';info.style.cssText='top:3px;left:50%;transform:translateX(-50%);padding:3px 10px;background:rgba(0,0,0,.85);border-radius:4px;font:bold 12px monospace;color:#0f0;border:1px solid #0f0;white-space:nowrap;';info.textContent='HYPERION v10 ['+els.length+' elementos | DINÁMICO 250ms]';document.body.appendChild(info);for(var i=0;i<els.length;i++){var e=els[i],r=e.rect,c=C[i%C.length];var d=document.createElement('div');d.className='hy-rr';d.style.cssText='left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px;background:'+c.f+';border:2px solid '+c.b+';';d.textContent='[' +(i+1)+'] '+e.text.slice(0,14);document.body.appendChild(d);}}catch(e){}}
  render();
  window.__HY_SINGLE_TIMER=setInterval(function(){if(window.__HY_KILL_ALL)return;render();},250);
  var dt=null;function dr(){if(dt)clearTimeout(dt);dt=setTimeout(render,50);}
  window.addEventListener('resize',dr);window.addEventListener('scroll',dr,{passive:true,capture:true});window.addEventListener('input',dr,{capture:true});
  try{var mo=new MutationObserver(dr);mo.observe(document.body,{childList:true,subtree:true});window.__hyMO=mo;}catch(e){}
})();
`;

// ══ ARCHIVOS ══════════════════════════════════════════════════════
const ART = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea';
const logoPath   = path.join(ART, 'fairdraw_official_logo_1784899306001.png');
const hookPath   = path.join(ART, 'fairdraw_hook_v2_1784905233658.png');
const corePath   = path.join(ART, 'fairdraw_core_v2_1784905267550.png');
const climaxPath = path.join(ART, 'fairdraw_climax_v2_1784905302909.png');

[logoPath, hookPath, corePath, climaxPath].forEach(p => {
  if (!fs.existsSync(p)) throw new Error('Archivo no encontrado: ' + p);
  console.log('✅ Archivo verificado:', path.basename(p));
});

const PROMPT = "Animate these 4 uploaded promotional images (Official FairDraw Logo, 3D Winner Hook, 3D AI Referee Core, 3D Friends Celebration Climax) into a high-energy 10-second vertical 9:16 promotional video for FairDraw online sweepstakes app. Show smooth transitions between the transparent sweepstakes hook, 100% provably fair algorithm, and the final YOU WON winner celebration climax.";

async function screenshot(ws, name) {
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(name, Buffer.from(ss.data, 'base64'));
  console.log('   📸', name);
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🚀 HYPERION v10 CORRECTED — Gemini Web Full Flow');
  console.log('═══════════════════════════════════════════════════════');

  // ── Conectar al tab de Gemini ──────────────────────────────────
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  const tab = tabs.find(t => t.type === 'page' && t.url && t.url.includes('gemini.google.com') && !t.url.includes('RotateCookies'));
  if (!tab) throw new Error('No se encontró tab de Gemini');
  console.log('📍 Tab:', tab.url);

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  await cdpCall(ws, 'Page.bringToFront');
  await cdpCall(ws, 'DOM.enable');

  // ── PASO 0: Nueva conversación limpia ─────────────────────────
  console.log('\n🆕 PASO 0: Nueva conversación...');
  await cdpCall(ws, 'Page.navigate', { url: 'https://gemini.google.com/u/1/app?hl=es' });
  await wait(4000);

  // ── PASO 1: Capa Manus Dinámica ───────────────────────────────
  console.log('\n📐 PASO 1: Capa Manus Dinámica (setInterval 250ms)...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS_SCRIPT });
  await wait(600);
  await screenshot(ws, 'c10_step1_layer.png');

  // Cerrar cualquier menú flotante abierto con Escape
  await cdpCall(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await wait(500);

  // PASO 2: Habilitar interceptor CDP ANTES de cualquier clic
  // — El interceptor captura el file chooser antes de que Windows lo muestre
  console.log('\n🛡️  PASO 2: Habilitando interceptor CDP de file chooser...');
  await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: true });

  // Preparar el listener del evento ANTES del clic
  const fileChooserPromise = new Promise((resolve, reject) => {
    const handler = async (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.method === 'Page.fileChooserOpened') {
          ws.removeListener('message', handler);
          console.log('   🎯 File chooser interceptado por CDP.');
          const { nodeId } = await cdpCall(ws, 'DOM.requestNode', { backendNodeId: msg.params.backendNodeId });
          resolve(nodeId);
        }
      } catch(e) { reject(e); }
    };
    ws.on('message', handler);
    setTimeout(() => { ws.removeListener('message', handler); reject(new Error('Timeout')); }, 10000);
  });

  // Click en (+) para abrir el menú
  console.log('\n📎 PASO 2B: Click en (+) [Subidas y herramientas]...');
  const plusRes = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b =>
          (b.getAttribute('aria-label') || '').toLowerCase().trim() === 'subidas y herramientas' ||
          (b.getAttribute('aria-label') || '').toLowerCase().trim() === 'uploads and tools'
        );
        if (btn) { const r = btn.getBoundingClientRect(); return JSON.stringify({x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2)}); }
        return null;
      })()
    `, returnByValue: true
  });
  let plusX = 612, plusY = 365;
  if (plusRes.result && plusRes.result.value) { const p = JSON.parse(plusRes.result.value); plusX = p.x; plusY = p.y; }
  console.log(`   (+) en (${plusX}, ${plusY})`);
  await mouseClick(ws, plusX, plusY);
      await wait(100);
      await cdpCall(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
    } else {
      console.log('   ❌ No se pudo resolver el nodeId del input.');
      ws.close(); process.exit(1);
    }
  } else {
    console.log('   ❌ No se encontró ningún input[type=file] en el Shadow DOM.');
    ws.close(); process.exit(1);
  }

  await wait(4000); // Esperar miniaturas
  await screenshot(ws, 'c10_step3_thumbnails.png');

  // ── PASO 4: Escribir prompt ───────────────────────────────────
  console.log('\n✍️  PASO 4: Escribiendo prompt...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const ed = document.querySelector('div[contenteditable="true"], textarea, [role="textbox"]');
        if (ed) {
          ed.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, ` + JSON.stringify(PROMPT) + `);
          ed.dispatchEvent(new Event('input', { bubbles: true }));
          return 'ok';
        }
        return 'editor not found';
      })()
    `
  });
  await wait(800);

  // ── PASO 5: Enviar — aria-label EXACTO "Enviar mensaje" ───────
  console.log('\n🚀 PASO 5: Enviando [aria="Enviar mensaje"]...');
  const sendResult = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b =>
          (b.getAttribute('aria-label') || '').trim() === 'Enviar mensaje' ||
          (b.getAttribute('aria-label') || '').trim() === 'Send message'
        );
        if (btn) { btn.click(); return 'clicked: ' + btn.getAttribute('aria-label'); }
        return 'not found';
      })()
    `,
    returnByValue: true
  });
  console.log('   Resultado:', sendResult.result.value);
  await screenshot(ws, 'c10_step5_sent.png');

  // ── PASO 6: Esperar generación + Descargar ────────────────────
  console.log('\n⏳ PASO 6: Esperando generación del video (~35s)...');
  await wait(35000);

  // Reinjectar capa para ver estado actual
  await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS_SCRIPT });
  await wait(500);
  await screenshot(ws, 'c10_step6_generated.png');

  // Descargar — aria-label EXACTO "Descargar vídeo"
  console.log('\n⬇️  PASO 7: Descargando [aria="Descargar vídeo"]...');
  const dlResult = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button, a')).find(b => {
          const aria = (b.getAttribute('aria-label') || '').trim();
          const txt  = (b.innerText || b.textContent || '').toLowerCase().trim();
          return aria === 'Descargar vídeo' || aria === 'Download video' || txt.includes('descargar') || txt.includes('download');
        });
        if (btn) {
          const r = btn.getBoundingClientRect();
          return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), aria: btn.getAttribute('aria-label') });
        }
        return null;
      })()
    `,
    returnByValue: true
  });

  if (dlResult.result && dlResult.result.value) {
    const pos = JSON.parse(dlResult.result.value);
    console.log(`   ✅ Botón descarga en (${pos.x}, ${pos.y}) aria="${pos.aria}"`);
    await mouseClick(ws, pos.x, pos.y);
    await wait(3000);
    await screenshot(ws, 'c10_step7_downloaded.png');
  } else {
    console.log('   ⚠️ Video aún generando — tomar screenshot para verificar');
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🎉 HYPERION v10 CORRECTED — COMPLETADO');
  console.log('═══════════════════════════════════════════════════════');
  ws.close();
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
