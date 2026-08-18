const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9222/json', r => {
  let d = ''; r.on('data', c => d += c); r.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('gemini.google.com') && t.type === 'page');
    if (!tab) { console.log('No Gemini tab'); return; }
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    let id = 1;
    const call = (m, p = {}) => new Promise((res, rej) => {
      const i = id++;
      const h = data => { const r = JSON.parse(data); if (r.id === i) { ws.off('message', h); r.error ? rej(r.error) : res(r.result); } };
      ws.on('message', h);
      ws.send(JSON.stringify({ id: i, method: m, params: p }));
    });
    const wait = ms => new Promise(r => setTimeout(r, ms));

    ws.on('open', async () => {
      await call('Page.bringToFront');
      await wait(500);

      // Dump HTML around the input box
      const htmlDump = await call('Runtime.evaluate', {
        expression: `(() => {
          // Let's find any element containing 'Ingresa una instrucción' or having contenteditable
          const all = Array.from(document.querySelectorAll('*'));
          const editorParent = all.find(e => (e.textContent||'').includes('Ingresa una instrucción') && e.children.length < 5);
          if (editorParent) {
            return editorParent.outerHTML;
          }
          // fallback: print body HTML structure near the bottom
          return document.body.innerHTML.substring(0, 1000);
        })()`, returnByValue: true
      });
      console.log('HTML Dump:', htmlDump.result?.value);

      // Let's also check all elements with contenteditable
      const editables = await call('Runtime.evaluate', {
        expression: `(() => {
          const els = document.querySelectorAll('[contenteditable]');
          return Array.from(els).map(e => e.outerHTML).join('\\n');
        })()`, returnByValue: true
      });
      console.log('\nEditable elements:', editables.result?.value);

      ws.close();
    });
  });
});
