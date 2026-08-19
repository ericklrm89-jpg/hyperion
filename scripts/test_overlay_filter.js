const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/70061E917F97EF9FC2862358A553459A');

ws.on('open', () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        function inViewport(r){
          return r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth && r.right > 0;
        }
        function isInteractive(el){
          if(!el || el.nodeType !== 1) return false;
          var tag = el.tagName;
          if(tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'A') return true;
          if(el.isContentEditable || el.getAttribute('contenteditable') === 'true' || el.getAttribute('role') === 'textbox') return true;
          var role = el.getAttribute('role');
          if(role === 'button' || role === 'tab' || role === 'menuitem' || role === 'listitem' || role === 'row' || role === 'option' || role === 'switch' || role === 'checkbox' || role === 'link' || role === 'gridcell') return true;
          if(el.hasAttribute('onclick') || el.hasAttribute('data-icon') || el.hasAttribute('data-tab') || el.hasAttribute('data-testid')) return true;
          var style = window.getComputedStyle(el);
          if(style.cursor === 'pointer') return true;
          return false;
        }

        var all = document.querySelectorAll('*');
        var rawList = [];
        for(var i = 0; i < all.length; i++){
          var el = all[i];
          if(!isInteractive(el)) continue;
          var b = el.getBoundingClientRect();
          if(b.width < 10 || b.height < 10) continue;
          if(b.width > window.innerWidth * 0.95 && b.height > window.innerHeight * 0.95) continue;
          if(!inViewport(b)) continue;
          rawList.push({ el: el, rect: b });
        }

        var filtered = [];
        for(var j = 0; j < rawList.length; j++){
          var item = rawList[j];
          var el = item.el;
          var b = item.rect;
          var isDuplicate = false;
          for(var k = 0; k < filtered.length; k++){
            var existing = filtered[k];
            var eb = existing.rect;
            var diffX = Math.abs(b.left - eb.left);
            var diffY = Math.abs(b.top - eb.top);
            var diffW = Math.abs(b.width - eb.width);
            var diffH = Math.abs(b.height - eb.height);
            if(diffX < 5 && diffY < 5 && diffW < 10 && diffH < 10){
              isDuplicate = true;
              break;
            }
          }
          if(!isDuplicate){
            filtered.push(item);
          }
        }

        return filtered.map((f, idx) => ({
          sid: idx + 1,
          tag: f.el.tagName,
          text: (f.el.getAttribute('aria-label') || f.el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 30),
          rect: { left: Math.round(f.rect.left), top: Math.round(f.rect.top), width: Math.round(f.rect.width), height: Math.round(f.rect.height) }
        }));
      })()`,
      returnByValue: true
    }
  }));
});

ws.on('message', (msg) => {
  const d = JSON.parse(msg);
  if (d.id === 1) {
    console.log('Filtered Elements in Overlay:', JSON.stringify(d.result?.result?.value, null, 2));
    ws.close();
    process.exit(0);
  }
});
