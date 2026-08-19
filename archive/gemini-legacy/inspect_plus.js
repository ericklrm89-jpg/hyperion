const http = require('http');
const WebSocket = require('ws');

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
  const tab = tabs.find(t => t.url.includes('gemini.google.com') && t.type === 'page');
  if (!tab) throw new Error('No Gemini tab');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  const res = await new Promise((resolve) => {
    ws.once('message', d => resolve(JSON.parse(d).result));
    ws.send(JSON.stringify({
      id: 99,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          return JSON.stringify(btns.map(b => ({
            label: b.getAttribute('aria-label') || '',
            text: (b.innerText || b.textContent || '').trim(),
            html: b.outerHTML.slice(0, 180)
          })));
        })()`,
        returnByValue: true
      }
    }));
  });

  console.log('BUTTONS LIST:');
  const list = JSON.parse(res.value || '[]');
  list.forEach((b, i) => {
    console.log(`[${i+1}] label="${b.label}" | text="${b.text}" | html="${b.html}"`);
  });

  ws.close();
}

main().catch(console.error);
