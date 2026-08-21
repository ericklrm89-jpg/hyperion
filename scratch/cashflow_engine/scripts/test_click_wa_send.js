const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

async function main() {
  const tabs = await new Promise(res => {
    http.get('http://127.0.0.1:9001/json', r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    });
  });

  const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!waTab) return;

  const ws = new WebSocket(waTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const send = (m, p={}) => new Promise(res => {
    const id = Math.floor(Math.random()*99999);
    const h = msg => {
      const d = JSON.parse(msg);
      if (d.id === id) { ws.off('message', h); res(d.result); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method: m, params: p }));
  });

  const clickRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const sendIcon = document.querySelector('span[data-icon="wds-ic-send-filled"]') ||
                       document.querySelector('span[data-icon="send"]') ||
                       document.querySelector('div[aria-label*="Enviar"]');
      if (sendIcon) {
        const btn = sendIcon.closest('button, div[role="button"]') || sendIcon;
        btn.click();
        return 'Clicked ' + (sendIcon.getAttribute('data-icon') || sendIcon.getAttribute('aria-label'));
      }
      return 'Not found';
    })()`,
    returnByValue: true
  });
  console.log('Click result:', clickRes);

  await new Promise(r => setTimeout(r, 4000));

  const snap = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
  if (snap?.data) {
    fs.writeFileSync('C:/hyperion/scratch/cashflow_engine/public/assets/live_wa_after_wds_send.jpg', Buffer.from(snap.data, 'base64'));
    console.log('Saved live_wa_after_wds_send.jpg');
  }

  ws.close();
}
main();
