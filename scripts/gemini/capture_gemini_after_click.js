const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

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
    var w=window.innerWidth,h=window.innerHeight;
    var sel='button,a,input,textarea,video,[role="button"],[role="menuitem"],[contenteditable="true"],span,div';
    var all=Array.from(document.querySelectorAll(sel)),r=[];
    for(var i=0;i<all.length;i++){try{var el=all[i],rc=el.getBoundingClientRect();if(rc.width<8||rc.height<8||rc.right<0||rc.bottom<0||rc.left>w||rc.top>h)continue;var cx=Math.round(rc.left+rc.width/2),cy=Math.round(rc.top+rc.height/2);var aria=el.getAttribute('aria-label')||el.getAttribute('title')||'';var txt=(aria||el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,22);if(!txt)continue;r.push({el:el,rc:rc,txt:txt,cx:cx,cy:cy});}catch(e){}
    }return r;
  };
  
  window.render = function(){
    try{
      document.querySelectorAll('.HYL').forEach(e=>e.remove());
      var els=window.vis();
      for(var i=0;i<els.length;i++){
        var e=els[i],c=C[i%C.length],d=document.createElement('div');
        d.className='HYL';
        d.style.cssText='left:'+e.rc.left+'px;top:'+e.rc.top+'px;width:'+e.rc.width+'px;height:'+e.rc.height+'px;background:'+c.f+';border:2px solid '+c.b+';';
        d.textContent='['+(i+1)+'] '+e.txt.slice(0,14);
        document.body.appendChild(d);
      }
    }catch(e){}
  };
  window.render();
})();`;

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)));
    }).on('error', rej);
  });
  
  const tab = tabs.find(t => t.type === 'page' && t.url.includes('gemini.google.com'));
  if (!tab) throw new Error('No se encontró la pestaña de Gemini Web');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await wait(500);

  // Inyectar Manus
  await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS });
  await wait(1000);

  // Buscar coordenadas del botón (+)
  const plusCoords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      if (typeof window.vis !== 'function') return null;
      const els = window.vis();
      const target = els.find(e => {
        const txt = e.txt.toLowerCase();
        const outsideSidebar = e.cx > 300;
        return outsideSidebar && (txt.includes('subir') || txt.includes('upload') || txt.includes('añadir') || txt.includes('add') || txt.includes('cargar') || txt.includes('carga'));
      });
      return target ? JSON.stringify({ x: target.cx, y: target.cy }) : null;
    })()`,
    returnByValue: true
  });

  if (plusCoords.result?.value) {
    const pc = JSON.parse(plusCoords.result.value);
    console.log(`🎯 Clic físico en botón (+): x=${pc.x}, y=${pc.y}`);
    await clickXY(ws, pc.x, pc.y);
    await wait(2500);
    
    // Volver a renderizar
    await cdpCall(ws, 'Runtime.evaluate', { expression: 'if(typeof window.render === "function") window.render();' });
    await wait(500);
  } else {
    console.log('⚠️ No se encontró el botón (+) en esta pestaña.');
  }

  // Tomar captura
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\gemini_after_click.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 Captura guardada: gemini_after_click.png');

  ws.close();
}
main().catch(console.error);
