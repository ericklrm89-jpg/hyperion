const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const gh = tabs.find(t => t.type === 'page' && t.url.includes('github.com/new'));
  if (!gh) return console.log('no gh tab');

  const ws = new WebSocket(gh.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));

  let id = 1;
  const call = (m, p = {}) => new Promise((res, rej) => {
    const h = data => {
      try {
        const r = JSON.parse(data);
        if (r.id === id) { ws.removeListener('message', h); res(r.result || {}); }
      } catch(e) {}
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id: id++, method: m, params: p }));
  });

  await call('Page.enable');
  await call('Page.bringToFront');

  // Fill repo name using keyboard typing simulation
  console.log('Finding repository name input...');
  const repoInputInfo = await call('Runtime.evaluate', {
    expression: `(() => {
      const inp = document.querySelector('input[data-testid="repository-name-input"], input[aria-label="Repository"], input#repository_name, input[name="repository[name]"], input[name="name"], input[placeholder*="Repository name"]');
      if (inp) {
        inp.focus();
        inp.value = 'hyperion';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
        const r = inp.getBoundingClientRect();
        return JSON.stringify({ found: true, x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return JSON.stringify({ found: false });
    })()`,
    returnByValue: true
  });
  console.log('Input info:', repoInputInfo.result?.value);

  await new Promise(r => setTimeout(r, 2000));

  // Check and click Create repository button
  console.log('Clicking Create repository button...');
  const btnClickRes = await call('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => {
        const txt = (b.textContent || '').trim().toLowerCase();
        return (txt === 'create repository' || txt === 'create a new repository' || txt.includes('create repository')) && !b.disabled;
      });
      if (btn) {
        btn.scrollIntoView({ block: 'center' });
        btn.click();
        return 'Clicked: ' + btn.textContent.trim();
      }
      return 'Button disabled or not found';
    })()`,
    returnByValue: true
  });
  console.log('Button click result:', btnClickRes.result?.value);

  await new Promise(r => setTimeout(r, 6000));

  const pageUrl = await call('Runtime.evaluate', { expression: 'window.location.href', returnByValue: true });
  console.log('Current URL after create:', pageUrl.result?.value);

  const ss = await call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\gh_NEW_REPO_STATUS.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved gh_NEW_REPO_STATUS.png');

  ws.close();
}

main().catch(console.error);
