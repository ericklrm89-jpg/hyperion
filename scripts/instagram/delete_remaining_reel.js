const http = require('http');
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

const MANUS = `(function(){
  try{if(window.__HYT){clearInterval(window.__HYT);}document.querySelectorAll('.HYL,.HYS').forEach(e=>e.remove());}catch(e){}
  var s=document.createElement('style');s.className='HYS';
  s.textContent='.HYL{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 11px/13px monospace;color:#fff;text-shadow:0 0 3px #000,0 0 6px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;}';
  document.head.appendChild(s);
  var C=[{f:'rgba(255,0,0,.4)',b:'#F00'},{f:'rgba(0,200,0,.4)',b:'#0C0'}];
  window.vis = function(){
    var w=window.innerWidth,h=window.innerHeight,sel='button,a,input,textarea,video,[role="button"],[role="menuitem"],[contenteditable="true"],span',all=Array.from(document.querySelectorAll(sel)),r=[];
    for(var i=0;i<all.length;i++){try{var el=all[i],rc=el.getBoundingClientRect();if(rc.width<8||rc.height<8||rc.right<0||rc.bottom<0||rc.left>w||rc.top>h)continue;var cx=Math.round(rc.left+rc.width/2),cy=Math.round(rc.top+rc.height/2);var aria=el.getAttribute('aria-label')||el.getAttribute('title')||'';var txt=(aria||el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,22);if(!txt)continue;r.push({el:el,rc:rc,txt:txt,cx:cx,cy:cy});}catch(e){}}return r;
  };
  function render(){try{document.querySelectorAll('.HYL').forEach(e=>e.remove());var els=window.vis();for(var i=0;i<els.length;i++){var e=els[i],c=C[i%C.length],d=document.createElement('div');d.className='HYL';d.style.cssText='left:'+e.rc.left+'px;top:'+e.rc.top+'px;width:'+e.rc.width+'px;height:'+e.rc.height+'px;background:'+c.f+';border:2px solid '+c.b+';';d.textContent='['+(i+1)+'] '+e.txt.slice(0,14);document.body.appendChild(d);}}catch(e){}}
  render(); window.__HYT=setInterval(render,250);
})();`;

async function main() {
  console.log('🚀 Iniciando borrador del Reel restante de la pestaña Reels...');
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

  // Asegurar que estamos en el perfil
  console.log('🧭 Navegando al perfil...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: 'window.location.href = "https://www.instagram.com/fairdrawapp/"' });
  await wait(5000);

  // Clic en la pestaña Reels del perfil
  console.log('🖱️ Clickeando en la pestaña Reels...');
  const reelsTabCoords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const tabs = Array.from(document.querySelectorAll('a'));
      const rt = tabs.find(a => (a.getAttribute('href')||'').includes('/reels/'));
      if (rt) {
        const r = rt.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });

  if (reelsTabCoords.result?.value) {
    const rc = JSON.parse(reelsTabCoords.result.value);
    await mouseClick(ws, rc.x, rc.y);
    await wait(3000); // Esperar que cargue la pestaña Reels
  }

  // Clickeando de forma nativa en la primera miniatura de la pestaña Reels
  console.log('🖱️ Clickeando miniatura del Reel...');
  const thumbCoords = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const links = Array.from(document.querySelectorAll('a')).filter(a => (a.getAttribute('href')||'').includes('/reel/'));
      if (links.length > 0) {
        const r = links[0].getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`,
    returnByValue: true
  });

  if (thumbCoords.result?.value) {
    const tc = JSON.parse(thumbCoords.result.value);
    await mouseClick(ws, tc.x, tc.y);
    await wait(4000); // Esperar lightbox del Reel

    // Inyectar Manus
    await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS });
    await wait(1000);

    // Clic en los 3 puntos
    console.log('🖱️ Buscando y clickeando opciones (3 puntos)...');
    const optCoords = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const els = window.vis();
        const target = els.find(e => {
          const aria = (e.el.getAttribute('aria-label')||'').toLowerCase();
          return (aria === 'más opciones' || aria === 'more options' || e.txt.toLowerCase().includes('opciones') || e.txt.toLowerCase().includes('options')) && e.cx > 500;
        }) || els.find(e => e.cx > 750 && e.cy < 150 && e.cy > 50);
        return target ? JSON.stringify({ x: target.cx, y: target.cy }) : null;
      })()`,
      returnByValue: true
    });

    if (optCoords.result?.value) {
      const oc = JSON.parse(optCoords.result.value);
      await mouseClick(ws, oc.x, oc.y);
      await wait(3000); // Esperar menú

      // Re-inyectar Manus
      await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS });
      await wait(1000);

      // Clic en "Delete"
      console.log('🖱️ Buscando opción "Delete"...');
      const delCoords = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const els = window.vis();
          const target = els.find(e => e.txt.toLowerCase().includes('delete') || e.txt.toLowerCase().includes('eliminar'));
          return target ? JSON.stringify({ x: target.cx, y: target.cy }) : null;
        })()`,
        returnByValue: true
      });

      if (delCoords.result?.value) {
        const dc = JSON.parse(delCoords.result.value);
        await mouseClick(ws, dc.x, dc.y);
        await wait(2500);

        // Re-inyectar Manus
        await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS });
        await wait(1000);

        // Confirmar eliminación final
        console.log('🖱️ Buscando confirmación final...');
        const confCoords = await cdpCall(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const els = window.vis();
            const target = els.find(e => e.txt.toLowerCase().includes('delete') || e.txt.toLowerCase().includes('eliminar'));
            return target ? JSON.stringify({ x: target.cx, y: target.cy }) : null;
          })()`,
          returnByValue: true
        });

        if (confCoords.result?.value) {
          const cc2 = JSON.parse(confCoords.result.value);
          await mouseClick(ws, cc2.x, cc2.y);
          console.log('⏳ Completando eliminación final del Reel (6s)...');
          await wait(6000);
        }
      }
    }
  }

  console.log('🎉 ¡Limpieza de Reels terminada!');
  ws.close();
}
main().catch(console.error);
