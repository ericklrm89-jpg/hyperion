const http = require('http');
const WebSocket = require('ws');

// Capa Manus Oficial
const MANUS = `(function(){
  try{if(window.__HYT){clearInterval(window.__HYT);}document.querySelectorAll('.HYL,.HYS').forEach(e=>e.remove());}catch(e){}
  var s=document.createElement('style');s.className='HYS';
  s.textContent='.HYL{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 11px/13px monospace;color:#fff;text-shadow:0 0 3px #000,0 0 6px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;}';
  document.head.appendChild(s);
  var C=[{f:'rgba(255,0,0,.4)',b:'#F00'},{f:'rgba(0,200,0,.4)',b:'#0C0'},{f:'rgba(0,100,255,.4)',b:'#06F'},{f:'rgba(200,200,0,.4)',b:'#CC0'},{f:'rgba(200,0,200,.4)',b:'#C0C'},{f:'rgba(0,200,200,.4)',b:'#0CC'}];
  function vis(){var w=window.innerWidth,h=window.innerHeight,sel='button,a,input,textarea,video,[role="button"],[role="menuitem"],[contenteditable="true"]',all=Array.from(document.querySelectorAll(sel)),r=[];
    for(var i=0;i<all.length;i++){try{var el=all[i],rc=el.getBoundingClientRect();if(rc.width<12||rc.height<12||rc.right<0||rc.bottom<0||rc.left>w||rc.top>h)continue;var cx=Math.round(rc.left+rc.width/2),cy=Math.round(rc.top+rc.height/2);var aria=el.getAttribute('aria-label')||el.getAttribute('title')||'';var txt=(aria||el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,22);if(!txt)continue;r.push({el:el,rc:rc,txt:txt,cx:cx,cy:cy});}catch(e){}}return r;}
  function render(){try{document.querySelectorAll('.HYL').forEach(e=>e.remove());var els=vis();var info=document.createElement('div');info.className='HYL';info.style.cssText='top:3px;left:50%;transform:translateX(-50%);padding:3px 10px;background:rgba(0,0,0,.85);border-radius:4px;font:bold 12px monospace;color:#0f0;border:1px solid #0f0;white-space:nowrap;';info.textContent='HYPERION INSTAGRAM ['+els.length+' | DINÁMICO 250ms]';document.body.appendChild(info);for(var i=0;i<els.length;i++){var e=els[i],c=C[i%C.length],d=document.createElement('div');d.className='HYL';d.style.cssText='left:'+e.rc.left+'px;top:'+e.rc.top+'px;width:'+e.rc.width+'px;height:'+e.rc.height+'px;background:'+c.f+';border:2px solid '+c.b+';';d.textContent='['+(i+1)+'] '+e.txt.slice(0,14);document.body.appendChild(d);}}catch(e){}}
  render(); window.__HYT=setInterval(render,250);
  console.log('✅ Capa Manus activada en Instagram.');
})();`;

async function main() {
  const tabs = await new Promise((res, reject) => {
    http.get('http://localhost:9222/json', r => {
      let d='';
      r.on('data',c=>d+=c);
      r.on('end',()=>{ try { res(JSON.parse(d)); } catch(e) { reject(e); } });
    }).on('error',reject);
  });
  
  const tab = tabs.find(t => t.type==='page' && t.url.includes('instagram.com'));
  if (!tab) throw new Error('No se encontró la pestaña de Instagram');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res) => ws.on('open', res));

  await ws.send(JSON.stringify({ id: 1, method: 'Page.bringToFront' }));
  await ws.send(JSON.stringify({ id: 2, method: 'Runtime.evaluate', params: { expression: MANUS } }));
  console.log('✅ Inyectado permanentemente en el navegador.');
  
  ws.close();
}
main().catch(console.error);
