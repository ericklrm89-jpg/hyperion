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
        var matched = [];
        for(var i=0; i<all.length; i++){
          var el = all[i];
          if(isInteractive(el)){
            var b = el.getBoundingClientRect();
            if(b.width >= 10 && b.height >= 10 && inViewport(b)){
              var txt = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim().replace(/\\s+/g,' ').slice(0,30);
              matched.push({
                tag: el.tagName,
                role: el.getAttribute('role'),
                text: txt,
                rect: { left: Math.round(b.left), top: Math.round(b.top), width: Math.round(b.width), height: Math.round(b.height) }
              });
            }
          }
        }
        return matched.filter(m => m.text.includes('Goberna') || m.text.includes('IMPARABLES') || m.text.includes('Mabel') || m.text.includes('Perros'));
      })()`,
      returnByValue: true
    }
  }));
});

ws.on('message', (msg) => {
  const d = JSON.parse(msg);
  if (d.id === 1) {
    console.log('Matched chats before deduplication:', JSON.stringify(d.result?.result?.value, null, 2));
    ws.close();
    process.exit(0);
  }
});
