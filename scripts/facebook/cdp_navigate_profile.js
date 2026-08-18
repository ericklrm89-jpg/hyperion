const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const OUT = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\';

async function main() {
  // Get fresh WebSocket URL from /json
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { 
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); 
    }).on('error',rej);
  });
  
  const fbTab = tabs.find(t => t.type==='page' && t.url.includes('facebook.com'));
  if (!fbTab) throw new Error('No FB page tab found');
  console.log('FB tab WS:', fbTab.webSocketDebuggerUrl);

  const ws = new WebSocket(fbTab.webSocketDebuggerUrl);
  let msgId = 1;
  const pending = new Map();

  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej, timer } = pending.get(msg.id);
        clearTimeout(timer);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result || {});
      }
    } catch(e) {}
  });

  await new Promise((res, rej) => {
    ws.on('open', res);
    ws.on('error', rej);
    setTimeout(() => rej(new Error('WS open timeout')), 5000);
  });

  const call = (method, params = {}, timeout = 20000) => new Promise((res, rej) => {
    const id = msgId++;
    const timer = setTimeout(() => { pending.delete(id); rej(new Error(`Timeout: ${method}`)); }, timeout);
    pending.set(id, { res, rej, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });

  console.log('Connected OK');

  // Navigate to FairDraw profile
  console.log('Navigating to facebook.com/fairdrawapp/ ...');
  try {
    await call('Page.navigate', { url: 'https://www.facebook.com/fairdrawapp/' }, 20000);
  } catch(e) {
    console.log('Navigate response timeout (OK - page is loading):', e.message);
  }
  
  console.log('Waiting 8s...');
  await new Promise(r => setTimeout(r, 8000));

  // Screenshot
  const ss = await call('Page.captureScreenshot', { format: 'png', quality: 80 }, 10000);
  fs.writeFileSync(OUT + 'fb_PROFILE_TOP.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_PROFILE_TOP.png');

  // Scroll and screenshot
  await call('Runtime.evaluate', { expression: 'window.scrollBy(0, 500)' });
  await new Promise(r => setTimeout(r, 2000));
  const ss2 = await call('Page.captureScreenshot', { format: 'png', quality: 80 }, 10000);
  fs.writeFileSync(OUT + 'fb_PROFILE_SCROLL.png', Buffer.from(ss2.data, 'base64'));
  console.log('Saved fb_PROFILE_SCROLL.png');

  ws.close();
  console.log('DONE');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
