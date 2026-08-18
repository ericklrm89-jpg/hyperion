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

async function mouseClick(ws, x, y) {
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await wait(60);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await wait(60);
  await cdpCall(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

http.get('http://localhost:9222/json', r => {
  let d = ''; r.on('data', c => d += c);
  r.on('end', async () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('facebook.com'));
    if (!tab) { console.log('No Facebook tab'); return; }

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(res => ws.on('open', res));
    console.log('WS open');

    // Navegar al perfil primero
    console.log('Navigating to profile...');
    await cdpCall(ws, 'Page.navigate', { url: 'https://www.facebook.com/profile.php?id=61590067290511' });
    await wait(6000);

    // Encontrar pestaña "Photos"
    console.log('Buscando pestaña "Photos"...');
    const photosTabCoords = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const tabs = Array.from(document.querySelectorAll('a[role="tab"], a'));
        const pTab = tabs.find(t => (t.textContent||'').trim().toLowerCase() === 'photos');
        if (pTab) {
          const r = pTab.getBoundingClientRect();
          return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
        }
        return null;
      })()`,
      returnByValue: true
    });

    if (!photosTabCoords.result?.value) {
      console.log('❌ Pestaña "Photos" no encontrada');
      ws.close();
      return;
    }
    const pc = JSON.parse(photosTabCoords.result.value);
    console.log('Clic en Photos:', pc);
    await mouseClick(ws, pc.x, pc.y);
    await wait(5000);

    // Inyectar Manus
    await cdpCall(ws, 'Runtime.evaluate', { expression: `(function(){
      try{if(window.__HYT){clearInterval(window.__HYT);}document.querySelectorAll('.HYL,.HYS').forEach(e=>e.remove());}catch(e){}
      var s=document.createElement('style');s.className='HYS';
      s.textContent='.HYL{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 10px/12px monospace;color:#fff;text-shadow:0 0 3px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;}';
      document.head.appendChild(s);
      var C=[{f:'rgba(255,0,0,.4)',b:'#F00'},{f:'rgba(0,200,0,.4)',b:'#0C0'},{f:'rgba(0,100,255,.4)',b:'#06F'},{f:'rgba(200,200,0,.4)',b:'#CC0'}];
      function vis(){var w=window.innerWidth,h=window.innerHeight,sel='button,a,input,textarea,[role=\"button\"],[role=\"link\"],[role=\"tab\"],[contenteditable=\"true\"]',all=Array.from(document.querySelectorAll(sel)),r=[];
        for(var i=0;i<all.length;i++){try{var el=all[i],rc=el.getBoundingClientRect();if(rc.width<12||rc.height<12||rc.right<0||rc.bottom<0||rc.left>w||rc.top>h)continue;var cx=Math.round(rc.left+rc.width/2),cy=Math.round(rc.top+rc.height/2);var aria=el.getAttribute('aria-label')||el.getAttribute('title')||'';var txt=(aria||el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,22);if(!txt)continue;r.push({el:el,rc:rc,txt:txt,cx:cx,cy:cy});}catch(e){}}return r;}
      function render(){try{document.querySelectorAll('.HYL').forEach(e=>e.remove());var els=vis();var info=document.createElement('div');info.className='HYL';info.style.cssText='top:3px;left:50%;transform:translateX(-50%);padding:3px 10px;background:rgba(0,0,0,.85);border-radius:4px;font:bold 12px monospace;color:#0f0;border:1px solid #0f0;white-space:nowrap;';info.textContent='HYPERION PHOTOS ['+els.length+']';document.body.appendChild(info);for(var i=0;i<els.length;i++){var e=els[i],c=C[i%C.length],d=document.createElement('div');d.className='HYL';d.style.cssText='left:'+e.rc.left+'px;top:'+e.rc.top+'px;width:'+e.rc.width+'px;height:'+e.rc.height+'px;background:'+c.f+';border:2px solid '+c.b+';';d.textContent='['+(i+1)+'] '+e.txt.slice(0,14);document.body.appendChild(d);}}catch(e){}}
      render(); window.__HYT=setInterval(render,250);
    })()` });
    await wait(500);

    // Tomar screenshot
    await cdpCall(ws, 'Page.enable');
    const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('fb_photos_tab.png', Buffer.from(ss.data, 'base64'));
    console.log('Screenshot saved to fb_photos_tab.png');

    // Volcar elementos
    const dump = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const els = Array.from(document.querySelectorAll('button, a, input, textarea, [role="button"], [role="link"], [role="tab"], [role="textbox"], div[contenteditable="true"]'));
        const visible = els.filter(e => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.top < 1500;
        }).map(e => {
          const r = e.getBoundingClientRect();
          return {
            tag: e.tagName,
            text: (e.textContent||'').trim().replace(/\\s+/g, ' ').slice(0, 40),
            aria: e.getAttribute('aria-label'),
            x: Math.round(r.left + r.width/2),
            y: Math.round(r.top + r.height/2),
            w: Math.round(r.width),
            h: Math.round(r.height)
          };
        });
        return visible.map(e => JSON.stringify(e)).join('\\n');
      })()`,
      returnByValue: true
    });
    console.log('\n=== PHOTOS TAB ELEMENTS ===');
    console.log(dump?.result?.value || '(none)');

    ws.close();
  });
});
