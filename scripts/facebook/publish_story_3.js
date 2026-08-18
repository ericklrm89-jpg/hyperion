const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const IMAGE_PATH = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea\\story_test_3_cropped.jpg';

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
    if (!tab) { console.log('❌ No Facebook tab'); return; }

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(res => ws.on('open', res));
    console.log('WS open');

    await cdpCall(ws, 'Page.enable');
    await cdpCall(ws, 'Page.bringToFront');

    console.log('🧭 Navegando a stories/create...');
    await cdpCall(ws, 'Runtime.evaluate', { expression: "window.location.href='https://www.facebook.com/stories/create'" });
    await wait(6000);

    // Inyectar Manus
    await cdpCall(ws, 'Runtime.evaluate', { expression: `(function(){
      try{if(window.__HYT){clearInterval(window.__HYT);}document.querySelectorAll('.HYL,.HYS').forEach(e=>e.remove());}catch(e){}
      var s=document.createElement('style');s.className='HYS';
      s.textContent='.HYL{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 10px/12px monospace;color:#fff;text-shadow:0 0 3px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;}';
      document.head.appendChild(s);
      var C=[{f:'rgba(255,0,0,.4)',b:'#F00'},{f:'rgba(0,200,0,.4)',b:'#0C0'},{f:'rgba(0,100,255,.4)',b:'#06F'},{f:'rgba(200,200,0,.4)',b:'#CC0'}];
      function vis(){var w=window.innerWidth,h=window.innerHeight,sel='button,a,input,textarea,[role=\"button\"],[role=\"link\"],[contenteditable=\"true\"]',all=Array.from(document.querySelectorAll(sel)),r=[];
        for(var i=0;i<all.length;i++){try{var el=all[i],rc=el.getBoundingClientRect();if(rc.width<12||rc.height<12||rc.right<0||rc.bottom<0||rc.left>w||rc.top>h)continue;var cx=Math.round(rc.left+rc.width/2),cy=Math.round(rc.top+rc.height/2);var aria=el.getAttribute('aria-label')||el.getAttribute('title')||'';var txt=(aria||el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,22);if(!txt)continue;r.push({el:el,rc:rc,txt:txt,cx:cx,cy:cy});}catch(e){}}return r;}
      function render(){try{document.querySelectorAll('.HYL').forEach(e=>e.remove());var els=vis();var info=document.createElement('div');info.className='HYL';info.style.cssText='top:3px;left:50%;transform:translateX(-50%);padding:3px 10px;background:rgba(0,0,0,.85);border-radius:4px;font:bold 12px monospace;color:#0f0;border:1px solid #0f0;white-space:nowrap;';info.textContent='HYPERION STORIES ['+els.length+']';document.body.appendChild(info);for(var i=0;i<els.length;i++){var e=els[i],c=C[i%C.length],d=document.createElement('div');d.className='HYL';d.style.cssText='left:'+e.rc.left+'px;top:'+e.rc.top+'px;width:'+e.rc.width+'px;height:'+e.rc.height+'px;background:'+c.f+';border:2px solid '+c.b+';';d.textContent='['+(i+1)+'] '+e.txt.slice(0,14);document.body.appendChild(d);}}catch(e){}}
      render(); window.__HYT=setInterval(render,250);
    })()` });

    console.log('📤 Buscando input de subida...');
    const doc = await cdpCall(ws, 'DOM.getDocument', { depth: -1, pierce: true });
    const rootNodeId = doc.root.nodeId;
    const queryRes = await cdpCall(ws, 'DOM.querySelector', {
      nodeId: rootNodeId,
      selector: 'input[type="file"]'
    });

    if (!queryRes.nodeId) {
      console.error('❌ input[type="file"] no encontrado');
      ws.close();
      return;
    }

    const nodeInfo = await cdpCall(ws, 'DOM.describeNode', { nodeId: queryRes.nodeId });
    const backendNodeId = nodeInfo.node.backendNodeId;

    console.log('📤 Inyectando imagen vertical 3...');
    await cdpCall(ws, 'DOM.setFileInputFiles', { backendNodeId, files: [IMAGE_PATH] });
    console.log('✅ Imagen 3 inyectada.');

    console.log('⏳ Esperando procesamiento de la historia (6s)...');
    await wait(6000);

    // Capturar pantalla de previsualización 3
    const ss1 = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('fb_story_preview_test3.png', Buffer.from(ss1.data, 'base64'));
    console.log('📸 fb_story_preview_test3.png guardada.');

    // Buscar botón Share to story
    const shareCoords = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const divs = Array.from(document.querySelectorAll('div, button'));
        const btn = divs.find(d => {
          const t = (d.textContent||'').trim();
          const r = d.getBoundingClientRect();
          return (t === 'Share to story' || t === 'Compartir en historia') && r.width > 100 && r.left < 400;
        });
        if (btn) {
          const r = btn.getBoundingClientRect();
          return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
        }
        return null;
      })()`,
      returnByValue: true
    });

    if (!shareCoords.result?.value) {
      console.log('❌ Botón "Share to story" no encontrado');
      ws.close();
      return;
    }
    const pc = JSON.parse(shareCoords.result.value);
    console.log('Clic en Share to story:', pc);
    await mouseClick(ws, pc.x, pc.y);
    await wait(6000);

    // Tomar screenshot final
    const ss2 = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('fb_story_published_3.png', Buffer.from(ss2.data, 'base64'));
    console.log('📸 fb_story_published_3.png guardada.');

    ws.close();
  });
});
