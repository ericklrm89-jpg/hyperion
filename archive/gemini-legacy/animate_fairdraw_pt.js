/**
 * HYPERION v11 — Gemini Web Flow (PORTUGUÉS - PRODUCCIÓN)
 * Sigue al 100% el patrón del SKILL.md gemini.md referencias
 *
 * REGLAS CLAVE:
 * 1. Capa Manus DINÁMICA con setInterval(render, 250) — NUNCA estática
 * 2. fileChooserPromise ANTES del clic en "Subir archivos"
 * 3. Esperar hidratación del editor ANTES de interactuar
 * 4. aria-label exacto del (+): "Cargas y herramientas" (verificado con dump_buttons.js)
 * 5. backendNodeId del evento Page.fileChooserOpened para DOM.setFileInputFiles
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');
const WebSocket = require('ws');

// ── CDP Engine ─────────────────────────────────────────────────────────────
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

// ── Capa Manus DINÁMICA (Motor 1 — según SKILL.md exacto) ─────────────────
const MANUS = `(function(){
  try{if(window.__HYT){clearInterval(window.__HYT);}document.querySelectorAll('.HYL,.HYS').forEach(e=>e.remove());}catch(e){}
  var s=document.createElement('style');s.className='HYS';
  s.textContent='.HYL{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 10px/12px monospace;color:#fff;text-shadow:0 0 3px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;}';
  document.head.appendChild(s);
  var C=[{f:'rgba(255,0,0,.4)',b:'#F00'},{f:'rgba(0,200,0,.4)',b:'#0C0'},{f:'rgba(0,100,255,.4)',b:'#06F'},{f:'rgba(200,200,0,.4)',b:'#CC0'},{f:'rgba(200,0,200,.4)',b:'#C0C'},{f:'rgba(0,200,200,.4)',b:'#0CC'}];
  function vis(){var w=window.innerWidth,h=window.innerHeight,sel='button,a,input,textarea,[role="button"],[role="menuitem"],[contenteditable="true"]',all=Array.from(document.querySelectorAll(sel)),r=[];
    for(var i=0;i<all.length;i++){try{var el=all[i],rc=el.getBoundingClientRect();if(rc.width<12||rc.height<12||rc.right<0||rc.bottom<0||rc.left>w||rc.top>h)continue;var cx=Math.round(rc.left+rc.width/2),cy=Math.round(rc.top+rc.height/2);var aria=el.getAttribute('aria-label')||el.getAttribute('title')||'';var txt=(aria||el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,22);if(!txt)continue;r.push({el:el,rc:rc,txt:txt,cx:cx,cy:cy});}catch(e){}}return r;}
  function render(){try{document.querySelectorAll('.HYL').forEach(e=>e.remove());var els=vis();var info=document.createElement('div');info.className='HYL';info.style.cssText='top:3px;left:50%;transform:translateX(-50%);padding:3px 10px;background:rgba(0,0,0,.85);border-radius:4px;font:bold 12px monospace;color:#0f0;border:1px solid #0f0;white-space:nowrap;';info.textContent='HYPERION v11 ['+els.length+' | DINÁMICO 250ms]';document.body.appendChild(info);for(var i=0;i<els.length;i++){var e=els[i],c=C[i%C.length],d=document.createElement('div');d.className='HYL';d.style.cssText='left:'+e.rc.left+'px;top:'+e.rc.top+'px;width:'+e.rc.width+'px;height:'+e.rc.height+'px;background:'+c.f+';border:2px solid '+c.b+';';d.textContent='['+(i+1)+'] '+e.txt.slice(0,14);document.body.appendChild(d);}}catch(e){}}
  render(); window.__HYT=setInterval(render,250);
  window.addEventListener('resize',render); window.addEventListener('scroll',render,{passive:true});
})();`;

// ── Archivos a subir (storyboard en portugués) ─────────────────────────────
const ART = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea';
const FILES = [
  path.join(ART, 'fairdraw_storyboard_pt_1_1785181462270.png'),
  path.join(ART, 'fairdraw_storyboard_pt_2_1785181480081.png'),
  path.join(ART, 'fairdraw_storyboard_pt_3_1785181517992.png')
];

const PROMPT_PT = 'Por favor, anime estas 3 ilustrações verticais do aplicativo de sorteios de prêmios FairDraw. Crie uma animação de vídeo promocional vertical de 10 segundos (formato 9:16) com transições dinâmicas de motion graphics e uma locução animada em português de Brasil que explique que o FairDraw realiza sorteios 100% transparentes e auditados com Inteligência Artificial. O foco do vídeo deve ser inteiramente em design gráfico, animação e ilustração 3D, sem pessoas reais.';

async function main() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('🚀 HYPERION v11 — Gemini Português (PRODUÇÃO)');
  console.log('═══════════════════════════════════════════════');

  // Obtener tab de Gemini
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ try { res(JSON.parse(d)); } catch(e) { rej(e); }});
    }).on('error',rej);
  });
  const tab = tabs.find(t => t.type==='page' && t.url.includes('gemini.google.com') && !t.url.includes('RotateCookies'));
  if (!tab) throw new Error('❌ No tab de Gemini encontrado en CDP');
  console.log('✅ Tab:', tab.url.slice(0, 60));

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.on('open', () => { console.log('✅ WebSocket CDP abierto.'); resolve(); });
    ws.on('error', (e) => reject(e));
  });

  await cdpCall(ws, 'Page.bringToFront');
  await cdpCall(ws, 'Page.enable');

  // ── PASO 0: Nueva conversación ─────────────────────────────────────────
  console.log('\n🆕 PASO 0: Iniciando nueva conversación...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const links = Array.from(document.querySelectorAll('a,button'));
      const btn = links.find(e => (e.getAttribute('aria-label')||e.textContent||'').toLowerCase().includes('nuevo chat') || (e.getAttribute('aria-label')||e.textContent||'').toLowerCase().includes('nueva conversa'));
      if(btn){ btn.click(); return 'clicked'; }
      window.onbeforeunload = null;
      window.location.href='https://gemini.google.com/app';
      return 'navigated';
    })()`
  });

  // ── Esperar hidratación del editor (Motor 5 — Ley 5) ──────────────────
  console.log('   ⏳ Esperando hidratación del editor...');
  let editorReady = false;
  for (let i = 0; i < 24; i++) {
    const check = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `!!document.querySelector('div[contenteditable="true"], textarea')`
    });
    if (check.result?.value) { editorReady = true; break; }
    await wait(500);
  }
  if (!editorReady) throw new Error('❌ Editor no cargó a tiempo tras nueva conversación');
  console.log('   ✅ Editor listo. Esperando 3s para handlers de Angular...');
  await wait(3000);

  // ── PASO 1: Inyectar capa Manus DINÁMICA (Ley #1 absoluta) ────────────
  console.log('\n🌐 PASO 1: [LEY #1] Inyectando capa Manus DINÁMICA (250ms loop)...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS });
  await wait(600);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\hy_01_manus.png');

  // ── PASO 2: Configurar bypass de archivos y descargas ─────────────────
  console.log('\n🔒 PASO 2: Configurando bypass de diálogos nativos...');
  await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: true });
  await cdpCall(ws, 'Page.setDownloadBehavior', { behavior: 'allow', downloadPath: 'C:\\Users\\erick\\Downloads' });

  // ── PASO 3: Definir fileChooserPromise ANTES del clic (Ley #7) ────────
  console.log('\n🎣 PASO 3: Registrando listener Page.fileChooserOpened ANTES del clic...');
  const fileChooserPromise = new Promise((resolve, reject) => {
    const h = (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.method === 'Page.fileChooserOpened') {
          ws.removeListener('message', h);
          console.log('   ✅ fileChooserOpened interceptado! backendNodeId:', msg.params.backendNodeId);
          resolve(msg.params.backendNodeId);
        }
      } catch(e) { reject(e); }
    };
    ws.on('message', h);
    setTimeout(() => { ws.removeListener('message', h); reject(new Error('Timeout: fileChooserOpened nunca llegó (10s)')); }, 10000);
  });

  // ── PASO 4: Clic en (+) con coordenadas dinámicas del DOM ─────────────
  console.log('\n🔧 PASO 4: Clic en "Cargas y herramientas" (+) con coordenadas DOM dinámicas...');
  const plusCoords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('button')).find(b => {
        const a = (b.getAttribute('aria-label')||'').toLowerCase();
        return a === 'cargas y herramientas' || a === 'subidas y herramientas' || a === 'uploads and tools';
      });
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return JSON.stringify({ x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2) });
    })()`,
    returnByValue: true
  });
  if (!plusCoords.result?.value) throw new Error('❌ Botón (+) no encontrado');
  const pc = JSON.parse(plusCoords.result.value);
  console.log(`   Coordenadas (+): x=${pc.x}, y=${pc.y}`);
  await mouseClick(ws, pc.x, pc.y);
  await wait(1500);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\hy_02_popup.png');

  // ── PASO 5: Clic en "Subir archivos" con coordenadas dinámicas del DOM ─
  console.log('\n📂 PASO 5: Clic en "Subir archivos" con coordenadas DOM dinámicas...');
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
  if (!pUp) throw new Error('❌ "Subir archivos" no encontrado en el popup');
  console.log(`   Coordenadas "Subir archivos": x=${pUp.x}, y=${pUp.y}`);
  await mouseClick(ws, pUp.x, pUp.y);

  // ── PASO 6: Inyectar archivos via backendNodeId (Motor 3 — Ley #2) ─────
  console.log('\n📤 PASO 6: Esperando interceptación e inyectando archivos...');
  const backendNodeId = await fileChooserPromise;
  await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId, files: FILES });
  await cdpCall(ws, 'Page.setInterceptFileChooserDialog', { enabled: false });
  console.log('   ✅ 3 imágenes inyectadas. Esperando renderización de miniaturas (6s)...');
  await wait(6000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\hy_03_archivos.png');

  // ── PASO 7: Escribir prompt en portugués (Motor 5) ────────────────────
  console.log('\n✍️ PASO 7: Inyectando prompt en portugués...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('div[contenteditable="true"],textarea');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(PROMPT_PT)});
        ed.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    })()`
  });
  await wait(1000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\hy_04_prompt.png');

  // ── PASO 8: Enviar mensaje ────────────────────────────────────────────
  console.log('\n🚀 PASO 8: Enviando mensaje...');
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

  console.log('\n✅ PROMPT ENVIADO A GEMINI. Esperando generación (90s)...');
  await wait(5000);
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\hy_05_generando.png');
  await wait(85000); // Total 90s de espera

  // ── PASO 9: Descargar video ───────────────────────────────────────────
  console.log('\n⬇️ PASO 9: Buscando botón de descarga...');
  await screenshot(ws, 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\hy_06_video_listo.png');

  const dlPos = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('button,a')).find(b => {
        const a = (b.getAttribute('aria-label')||'').trim().toLowerCase();
        return a === 'descargar vídeo' || a === 'download video' || a.includes('descargar');
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
    console.log('   ✅ ¡Video descargado en C:\\Users\\erick\\Downloads!');
  } else {
    console.log('   ⚠️ Botón de descarga no encontrado aún. Verifica hy_06_video_listo.png');
  }

  ws.close();
  console.log('\n✅ ═══════════════════════════════════════════════');
  console.log('   HYPERION v11 — Flujo Português COMPLETADO');
  console.log('═══════════════════════════════════════════════\n');
}
main().catch(e => { console.error('❌ FATAL:', e.message); process.exit(1); });
