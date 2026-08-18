const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const VIDEO_PATH = 'C:\\hyperion\\media\\fairdraw_v2_promo.mp4';

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

async function clickXY(ws, x, y) {
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(80);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

const MANUS = `(function(){
  try{if(window.__HYT){clearInterval(window.__HYT);}document.querySelectorAll('.HYL,.HYS').forEach(e=>e.remove());}catch(e){}
  var s=document.createElement('style');s.className='HYS';
  s.textContent='.HYL{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 11px/13px monospace;color:#fff;text-shadow:0 0 3px #000,0 0 6px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;}';
  document.head.appendChild(s);
  var C=[{f:'rgba(255,0,0,.4)',b:'#F00'},{f:'rgba(0,200,0,.4)',b:'#0C0'},{f:'rgba(0,100,255,.4)',b:'#06F'},{f:'rgba(200,200,0,.4)',b:'#CC0'}];
  window.vis = function(){
    // Ampliamos selectores para incluir svg y elementos con rol button dentro del diálogo de carga
    var w=window.innerWidth,h=window.innerHeight,sel='button,a,input,textarea,video,[role="button"],[role="menuitem"],[contenteditable="true"],span,svg',all=Array.from(document.querySelectorAll(sel)),r=[];
    for(var i=0;i<all.length;i++){try{var el=all[i],rc=el.getBoundingClientRect();if(rc.width<8||rc.height<8||rc.right<0||rc.bottom<0||rc.left>w||rc.top>h)continue;var cx=Math.round(rc.left+rc.width/2),cy=Math.round(rc.top+rc.height/2);var aria=el.getAttribute('aria-label')||el.getAttribute('title')||'';var txt=(aria||el.textContent||el.className||'').toString().replace(/\\s+/g,' ').trim().slice(0,22);r.push({el:el,rc:rc,txt:txt,cx:cx,cy:cy});}catch(e){}
    }return r;
  };
  function render(){try{document.querySelectorAll('.HYL').forEach(e=>e.remove());var els=window.vis();for(var i=0;i<els.length;i++){var e=els[i],c=C[i%C.length],d=document.createElement('div');d.className='HYL';d.style.cssText='left:'+e.rc.left+'px;top:'+e.rc.top+'px;width:'+e.rc.width+'px;height:'+e.rc.height+'px;background:'+c.f+';border:2px solid '+c.b+';';d.textContent='['+(i+1)+'] '+e.txt.slice(0,14);document.body.appendChild(d);}}catch(e){}}
  render(); window.__HYT=setInterval(render,250);
})();`;

async function main() {
  console.log('🚀 Iniciando script de diagnóstico del diálogo de subida...');
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)));
    }).on('error', rej);
  });
  
  const tab = tabs.find(t => t.type === 'page' && t.url.includes('instagram.com'));
  if (!tab) throw new Error('No se encontró tab de Instagram');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // Recargar
  console.log('🧭 Recargando Instagram...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: 'window.location.href = "https://www.instagram.com/fairdrawapp/"' });
  await wait(6000);

  // Clic en Crear
  console.log('🖱️ Clickeando "Crear"...');
  const createCoords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const els = Array.from(document.querySelectorAll('a, button, div[role="button"], span'));
      const sidebarCreate = els.find(e => {
        const aria = (e.getAttribute('aria-label')||'').toLowerCase();
        const r = e.getBoundingClientRect();
        return r.left < 100 && r.width > 0 && (aria.includes('crear') || aria.includes('create') || aria.includes('post'));
      });
      if (sidebarCreate) {
        const r = sidebarCreate.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });

  const cc = JSON.parse(createCoords.result.value);
  await clickXY(ws, cc.x, cc.y);
  await wait(3000);

  // Inyectar video
  console.log('📤 Marcando input file e inyectando video...');
  await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const input = document.querySelector('input[type="file"]');
      if (input) input.setAttribute('data-hu', '1');
    })()`
  });
  await wait(500);

  const doc = await cdpCall(ws, 'DOM.getDocument');
  const inp = await cdpCall(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[data-hu]' });
  
  if (inp && inp.nodeId) {
    const ni = await cdpCall(ws, 'DOM.describeNode', { nodeId: inp.nodeId });
    await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId: ni.node.backendNodeId, files: [VIDEO_PATH] });
    console.log('⏳ Esperando 12 segundos para procesamiento de video...');
    await wait(12000);
  }

  // Inyectar Manus
  console.log('🎨 Inyectando Manus en el diálogo de carga...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS });
  await wait(1000);

  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\ig_upload_manus.png', Buffer.from(ss.data, 'base64'));
  console.log('✅ ig_upload_manus.png guardado con badges.');

  ws.close();
}
main().catch(console.error);
