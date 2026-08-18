const http = require('http');
const WebSocket = require('ws');

http.get('http://localhost:9222/json', r => {
  let d=''; r.on('data',c=>d+=c);
  r.on('end', async () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.type==='page' && t.url.includes('gemini.google.com'));
    if (!tab) { console.log('No Gemini tab found'); process.exit(1); }
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      let id = 1;
      ws.send(JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            return JSON.stringify(Array.from(document.querySelectorAll("button, a")).map(b => ({
              aria: b.getAttribute("aria-label"),
              text: b.innerText,
              title: b.getAttribute("title"),
              rect: b.getBoundingClientRect()
            })));
          })()`,
          returnByValue: true
        }
      }));
      ws.on('message', raw => {
        const m = JSON.parse(raw);
        if (m.id === id) {
          const res = JSON.parse(m.result.result.value);
          console.log('\n=== BOTONES EN EL CHAT LIMPIO ===');
          res.forEach((b, i) => {
            const aria = (b.aria || '').trim();
            const text = (b.text || '').trim();
            const title = (b.title || '').trim();
            const x = Math.round(b.rect.left + b.rect.width/2);
            const y = Math.round(b.rect.top + b.rect.height/2);
            if (aria || text || title) {
              console.log(`[${i}] Text: "${text}" | Aria: "${aria}" | Title: "${title}" | Coord: (${x}, ${y}) | Rect: w=${Math.round(b.rect.width)}, h=${Math.round(b.rect.height)}`);
            }
          });
          ws.close();
        }
      });
    });
  });
});
