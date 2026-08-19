const WebSocket = require('ws');
const fs = require('fs');

async function testPaneSide() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/70061E917F97EF9FC2862358A553459A');
  await new Promise(r => ws.on('open', r));

  let cdpId = 1;
  const cdpCall = (method, params = {}) => new Promise((resolve, reject) => {
    const id = cdpId++;
    const handler = (data) => {
      try {
        const res = JSON.parse(data);
        if (res.id === id) {
          ws.removeListener('message', handler);
          res.error ? reject(new Error(JSON.stringify(res.error))) : resolve(res.result || {});
        }
      } catch(e) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  // Query exact chat rows in pane-side
  const query = await cdpCall('Runtime.evaluate', {
    expression: `(() => {
      const pane = document.querySelector('#pane-side');
      if(!pane) return { error: 'No pane-side' };

      // Find all direct/indirect chat items
      const rows = Array.from(pane.querySelectorAll('div[role="row"], div[role="listitem"], div[data-testid="cell-frame-container"]'));
      
      return rows.map((r, i) => {
        const rect = r.getBoundingClientRect();
        const textSpan = r.querySelector('span[title], div[title], span._ao3e, span.x1iyjqo2');
        const text = textSpan ? (textSpan.getAttribute('title') || textSpan.textContent) : (r.textContent || '').slice(0, 30);
        return {
          index: i,
          tag: r.tagName,
          role: r.getAttribute('role'),
          text: text,
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      });
    })()`,
    returnByValue: true
  });

  console.log('Chat rows detected in #pane-side:', JSON.stringify(query.result.value, null, 2));
  ws.close();
}

testPaneSide().catch(console.error);
