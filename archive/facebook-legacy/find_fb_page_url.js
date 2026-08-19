/**
 * HYPERION — Discover Exact Facebook Page Profile URL
 */
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

let cdpId = 1;
function cdpCall(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = cdpId++;
    const h = (data) => {
      try {
        const r = JSON.parse(data);
        if (r.id === id) { ws.removeListener('message', h); r.error ? reject(new Error(JSON.stringify(r.error))) : resolve(r.result || {}); }
      } catch(e) {}
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  const fbTab = tabs.find(t => t.type==='page' && t.url.includes('facebook.com'));
  if (!fbTab) throw new Error('No FB tab');

  const ws = new WebSocket(fbTab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'Page.bringToFront');

  // Go to main Facebook home
  console.log('Navigating to https://www.facebook.com/ ...');
  await cdpCall(ws, 'Runtime.evaluate', { expression: "window.location.href='https://www.facebook.com/';" });
  await wait(7000);

  // Click Page Profile icon top right
  console.log('Clicking top right Page profile menu icon...');
  const pageLink = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const a = Array.from(document.querySelectorAll('a')).find(el => {
        const href = el.getAttribute('href') || '';
        return href.includes('profile.php') || (href.startsWith('/') && !href.includes('home') && !href.includes('reels') && !href.includes('watch') && href.length > 5);
      });
      if (a) return a.href;
      return null;
    })()`,
    returnByValue: true
  });
  console.log('Detected Page URL:', pageLink.result?.value);

  // Screenshot home feed
  let ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_HOME_FEED.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved fb_HOME_FEED.png');

  if (pageLink.result?.value) {
    await cdpCall(ws, 'Runtime.evaluate', { expression: `window.location.href='${pageLink.result.value}';` });
    await wait(7000);
    ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_ACTUAL_PROFILE_PAGE.png', Buffer.from(ss.data, 'base64'));
    console.log('Saved fb_ACTUAL_PROFILE_PAGE.png');
  }

  ws.close();
}

main().catch(console.error);
