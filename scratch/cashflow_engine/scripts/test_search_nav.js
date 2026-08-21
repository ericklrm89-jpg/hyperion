const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

async function testSearchNav(phone = '593992345678') {
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

  // Focus search box
  const searchRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const searchBox = document.querySelector('div[contenteditable="true"][data-tab="3"]') ||
                        document.querySelector('div[role="textbox"][aria-label*="Buscar"]') ||
                        document.querySelector('div[role="textbox"]');
      if (searchBox) {
        searchBox.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(phone)});
        searchBox.dispatchEvent(new Event('input', { bubbles: true }));
        return 'Typed phone in search box';
      }
      return 'Search box not found';
    })()`,
    returnByValue: true
  });
  console.log('Search focus result:', searchRes);

  await new Promise(r => setTimeout(r, 2000));

  // Press Enter
  await send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
  await new Promise(r => setTimeout(r, 3000));

  const snap = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
  if (snap?.data) {
    fs.writeFileSync('C:/hyperion/scratch/cashflow_engine/public/assets/live_wa_search_nav_test.jpg', Buffer.from(snap.data, 'base64'));
    console.log('Saved live_wa_search_nav_test.jpg');
  }

  ws.close();
}

testSearchNav();
