const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

http.get('http://localhost:9222/json', r => {
  let d = ''; r.on('data', c => d += c);
  r.on('end', async () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.type === 'page' && t.url.includes('facebook.com'));
    if (!tab) return;
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'png' } }));
      ws.on('message', raw => {
        const m = JSON.parse(raw);
        if (m.id === 1) {
          fs.writeFileSync('fb_current_state.png', Buffer.from(m.result.data, 'base64'));
          console.log('Saved fb_current_state.png');
          ws.close();
        }
      });
    });
  });
});
