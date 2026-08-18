const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

http.get('http://localhost:9222/json', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    const tabs = JSON.parse(data);
    const t = tabs.find(x => x.type === 'page' && x.url.includes('gemini.google.com') && !x.url.includes('RotateCookiesPage'));
    if (!t) return console.log('Tab no encontrada');

    const ws = new WebSocket(t.webSocketDebuggerUrl);
    ws.on('open', async () => {
      console.log('1. Realizando Hover y Clic Secuencial en el botón [241] (+)...');
      ws.send(JSON.stringify({ id: 1, method: 'Page.bringToFront' }));

      // MouseMove to (396, 502)
      ws.send(JSON.stringify({
        id: 2,
        method: 'Input.dispatchMouseEvent',
        params: { type: 'mouseMoved', x: 396, y: 502 }
      }));

      await new Promise(r => setTimeout(r, 200));

      // MousePress & MouseRelease
      ws.send(JSON.stringify({
        id: 3,
        method: 'Input.dispatchMouseEvent',
        params: { type: 'mousePressed', x: 396, y: 502, button: 'left', clickCount: 1 }
      }));
      ws.send(JSON.stringify({
        id: 4,
        method: 'Input.dispatchMouseEvent',
        params: { type: 'mouseReleased', x: 396, y: 502, button: 'left', clickCount: 1 }
      }));

      await new Promise(r => setTimeout(r, 1200));

      // Re-inyectar Capa Manus con Badges [1..N]
      ws.send(JSON.stringify({
        id: 5,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            (function(){
              try { document.querySelectorAll('.hy-rr,.hy-st').forEach(e => e.remove()); } catch(e){}
              var s = document.createElement('style');
              s.className = 'hy-st';
              s.textContent = '.hy-rr{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 11px/13px monospace;color:#fff;text-shadow:0 0 3px #000;padding:1px 3px;border:2px solid;}';
              document.head.appendChild(s);

              var C = [{f:'rgba(255,0,0,0.4)',b:'#F00'},{f:'rgba(0,200,0,0.4)',b:'#0C0'},{f:'rgba(0,100,255,0.4)',b:'#06F'},{f:'rgba(200,200,0,0.4)',b:'#CC0'}];

              function getAllDeepElements(root = document) {
                let els = Array.from(root.querySelectorAll('button, a, input, [role="button"], [role="menuitem"]'));
                let allNodes = Array.from(root.querySelectorAll('*'));
                for (let i = 0; i < allNodes.length; i++) {
                  if (allNodes[i].shadowRoot) els = els.concat(getAllDeepElements(allNodes[i].shadowRoot));
                }
                return els;
              }

              var all = getAllDeepElements(document);
              var vis = [];
              for (var i = 0; i < all.length; i++) {
                var el = all[i];
                if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
                var r = el.getBoundingClientRect();
                if (r.width < 10 || r.height < 10) continue;
                var text = (el.getAttribute('aria-label') || el.innerText || el.textContent || el.tagName).trim().slice(0, 15);
                vis.push({ el: el, rect: r, text: text });
              }

              for (var j = 0; j < vis.length; j++) {
                var item = vis[j], rect = item.rect, color = C[j % C.length];
                var b = document.createElement('div');
                b.className = 'hy-rr';
                b.style.cssText = 'left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;background:' + color.f + ';border:2px solid ' + color.b + ';';
                b.textContent = '[' + (j + 1) + '] ' + item.text;
                document.body.appendChild(b);
              }
              return vis.length;
            })()
          `
        }
      }));
    });

    ws.on('message', async msg => {
      const res = JSON.parse(msg);
      if (res.id === 5) {
        await new Promise(r => setTimeout(r, 1000));
        ws.send(JSON.stringify({ id: 6, method: 'Page.captureScreenshot', params: { format: 'png' } }));
      }
      if (res.id === 6 && res.result) {
        fs.writeFileSync('gemini_hover_menu_badges.png', Buffer.from(res.result.data, 'base64'));
        console.log('📸 Captura con menú emergente y badges guardada: gemini_hover_menu_badges.png');
        process.exit(0);
      }
    });
  });
});
