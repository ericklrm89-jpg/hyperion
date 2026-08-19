const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const ghTab = tabs.find(t => t.type === 'page' && t.url.includes('github.com/new'));
  if (!ghTab) throw new Error('No GitHub new repo tab found');

  const ws = new WebSocket(ghTab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));

  let id = 1;
  const call = (method, params = {}) => new Promise((res, rej) => {
    const h = data => {
      try {
        const r = JSON.parse(data);
        if (r.id === id) { ws.removeListener('message', h); res(r.result || {}); }
      } catch(e) {}
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id: id++, method, params }));
  });

  await call('Page.enable');
  await call('Page.bringToFront');

  console.log('1. Filling Repository Name (hyperion)...');
  const nameRes = await call('Runtime.evaluate', {
    expression: `(() => {
      const nameInput = document.querySelector('input[data-testid="repository-name-input"], input[aria-label="Repository"], input#repository_name, input[name="repository[name]"], input[name="name"]');
      if (nameInput) {
        nameInput.focus();
        nameInput.value = 'hyperion';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
        return 'Filled name via input: ' + nameInput.outerHTML.slice(0, 80);
      }
      const anyInp = Array.from(document.querySelectorAll('input[type="text"]')).find(i => {
        const p = (i.placeholder || '').toLowerCase();
        const a = (i.getAttribute('aria-label') || '').toLowerCase();
        return p.includes('name') || a.includes('repository') || i.id.includes('name');
      });
      if (anyInp) {
        anyInp.focus();
        anyInp.value = 'hyperion';
        anyInp.dispatchEvent(new Event('input', { bubbles: true }));
        anyInp.dispatchEvent(new Event('change', { bubbles: true }));
        return 'Filled fallback: ' + anyInp.outerHTML.slice(0, 80);
      }
      return 'Name input not found';
    })()`,
    returnByValue: true
  });
  console.log('Name result:', nameRes.result?.value);
  await new Promise(r => setTimeout(r, 1000));

  console.log('2. Filling Description...');
  const descRes = await call('Runtime.evaluate', {
    expression: `(() => {
      const descInput = document.querySelector('input[name="repository[description]"], input#repository_description, input[name="Description"], input[placeholder*="Description"], textarea[placeholder*="Description"]');
      if (descInput) {
        descInput.focus();
        descInput.value = 'Hyperion Universal Web Agent & MCP Server - Real Chrome automation with 5 perception engines, Manus dynamic visual overlay, and multi-social platform engines.';
        descInput.dispatchEvent(new Event('input', { bubbles: true }));
        descInput.dispatchEvent(new Event('change', { bubbles: true }));
        return 'Description filled';
      }
      return 'Description input not found';
    })()`,
    returnByValue: true
  });
  console.log('Desc result:', descRes.result?.value);
  await new Promise(r => setTimeout(r, 1500));

  console.log('3. Clicking Create repository button...');
  const createRes = await call('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(b => {
        const txt = (b.textContent || '').trim().toLowerCase();
        return (txt.includes('create repository') || txt.includes('create a new repository')) && !b.disabled;
      });
      if (btns.length > 0) {
        const b = btns[btns.length - 1];
        b.scrollIntoView({ block: 'center' });
        b.click();
        return 'Clicked: ' + b.textContent.trim();
      }
      return 'Create button not found or disabled';
    })()`,
    returnByValue: true
  });
  console.log('Create button result:', createRes.result?.value);

  console.log('4. Waiting 6s for GitHub repository initialization...');
  await new Promise(r => setTimeout(r, 6000));

  const finalUrl = await call('Runtime.evaluate', { expression: 'window.location.href', returnByValue: true });
  console.log('Final URL:', finalUrl.result?.value);

  const ss = await call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\gh_REPO_CREATED.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved gh_REPO_CREATED.png');

  ws.close();
}

main().catch(console.error);
