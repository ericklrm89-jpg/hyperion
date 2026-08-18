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

const MANUS = `(function(){
  try{if(window.__HYT){clearInterval(window.__HYT);}document.querySelectorAll('.HYL,.HYS').forEach(e=>e.remove());}catch(e){}
  var s=document.createElement('style');s.className='HYS';
  s.textContent='.HYL{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 10px/12px monospace;color:#fff;text-shadow:0 0 3px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;}';
  document.head.appendChild(s);
  var C=[{f:'rgba(255,0,0,.4)',b:'#F00'},{f:'rgba(0,200,0,.4)',b:'#0C0'},{f:'rgba(0,100,255,.4)',b:'#06F'},{f:'rgba(200,200,0,.4)',b:'#CC0'}];
  function vis(){var w=window.innerWidth,h=window.innerHeight,sel='button,a,input,textarea,[role=\"button\"],[role=\"link\"],[contenteditable=\"true\"]',all=Array.from(document.querySelectorAll(sel)),r=[];
    for(var i=0;i<all.length;i++){try{var el=all[i],rc=el.getBoundingClientRect();if(rc.width<12||rc.height<12||rc.right<0||rc.bottom<0||rc.left>w||rc.top>h)continue;var cx=Math.round(rc.left+rc.width/2),cy=Math.round(rc.top+rc.height/2);var aria=el.getAttribute('aria-label')||el.getAttribute('title')||'';var txt=(aria||el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,22);if(!txt)continue;r.push({el:el,rc:rc,txt:txt,cx:cx,cy:cy});}catch(e){}}return r;}
  function render(){try{document.querySelectorAll('.HYL').forEach(e=>e.remove());var els=vis();var info=document.createElement('div');info.className='HYL';info.style.cssText='top:3px;left:50%;transform:translateX(-50%);padding:3px 10px;background:rgba(0,0,0,.85);border-radius:4px;font:bold 12px monospace;color:#0f0;border:1px solid #0f0;white-space:nowrap;';info.textContent='HYPERION FB DIAGNOSE ['+els.length+' | DINÁMICO 250ms]';document.body.appendChild(info);for(var i=0;i<els.length;i++){var e=els[i],c=C[i%C.length],d=document.createElement('div');d.className='HYL';d.style.cssText='left:'+e.rc.left+'px;top:'+e.rc.top+'px;width:'+e.rc.width+'px;height:'+e.rc.height+'px;background:'+c.f+';border:2px solid '+c.b+';';d.textContent='['+(i+1)+'] '+e.txt.slice(0,14);document.body.appendChild(d);}}catch(e){}}
  render(); window.__HYT=setInterval(render,250);
})();`;

http.get('http://127.0.0.1:9222/json', r => {
  let d = ''; r.on('data', c => d += c);
  r.on('end', async () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('facebook.com') && !t.url.includes('instagram'));
    if (!tab) {
      console.log('❌ No active Facebook tab found.');
      return;
    }

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('🔗 Conectado a Facebook:', tab.url);
      await cdpCall(ws, 'Page.enable');
      await cdpCall(ws, 'Page.bringToFront');

      console.log('🧭 Navegando al perfil de la página...');
      await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href='https://www.facebook.com/profile.php?id=61590067290511'` });
      await wait(6000);

      console.log('↕️ Desplazando biografía hacia abajo para revelar posts...');
      await cdpCall(ws, 'Runtime.evaluate', { expression: `window.scrollTo(0, 500);` });
      await wait(1500);

      // Inyectar Manus
      await cdpCall(ws, 'Runtime.evaluate', { expression: MANUS });
      await wait(1000);

      // Tomar captura
      const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('fb_profile_diagnose.png', Buffer.from(ss.data, 'base64'));
      console.log('📸 fb_profile_diagnose.png guardada.');

      // Dump de botones y opciones de post en pantalla
      const els = await cdpCall(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const items = Array.from(document.querySelectorAll('div[role="button"], button, svg, [aria-label]'));
          return items.map(el => {
            const rc = el.getBoundingClientRect();
            const aria = el.getAttribute('aria-label') || '';
            const txt = (el.textContent || '').trim().replace(/\\s+/g, ' ');
            if (rc.width < 10 || rc.height < 10) return null;
            return JSON.stringify({
              tag: el.tagName,
              aria: aria.slice(0, 40),
              text: txt.slice(0, 30),
              x: Math.round(rc.left),
              y: Math.round(rc.top),
              w: Math.round(rc.width),
              h: Math.round(rc.height)
            });
          }).filter(Boolean).slice(0, 80).join('\\n');
        })()`,
        returnByValue: true
      });
      console.log('\n=== FB INTERACTIVE ELEMENTS ===');
      console.log(els.result?.value);

      ws.close();
    });
  });
});
