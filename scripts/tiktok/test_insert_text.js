const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const VIDEO = 'C:\\Users\\erick\\Downloads\\Por_favor_anime_estas_ilust.mp4';
const COPY_TT = `Sorteios 100% transparentes com IA 🎉🛡️

O FairDraw usa Inteligência Artificial para garantir sorteios justos e auditados.

Acesse fairdrawapp.com! 🌐
#FairDraw #Sorteio #IA #Transparencia`;

http.get('http://127.0.0.1:9222/json', r => {
  let d = ''; r.on('data', c => d += c); r.on('end', () => {
    const tabs = JSON.parse(d);
    const tab = tabs.find(t => t.url.includes('tiktok.com') && t.type === 'page');
    if (!tab) { console.log('No TikTok tab'); return; }
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

      console.log('🔄 Reloading page...');
      await call('Runtime.evaluate', { expression: 'window.onbeforeunload = null;' });
      await call('Page.reload');
      await wait(8000);

      console.log('🖱️ Clicking sidebar Upload...');
      await call('Runtime.evaluate', {
        expression: `(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(e => (e.textContent||'').trim() === 'Upload');
          if (btn) btn.click();
        })()`
      });
      await wait(5000);

      console.log('📤 Injecting video...');
      const doc = await call('DOM.getDocument', { depth: -1, pierce: true });
      const qr = await call('DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
      if (!qr.nodeId) throw new Error('input type file not found');
      const ni = await call('DOM.describeNode', { nodeId: qr.nodeId });
      await call('DOM.setFileInputFiles', { backendNodeId: ni.node.backendNodeId, files: [VIDEO] });
      
      console.log('⏳ Waiting for upload (12s)...');
      await wait(12000);

      console.log('✍️ Focusing editor...');
      const focused = await call('Runtime.evaluate', {
        expression: `(() => {
          const ed = Array.from(document.querySelectorAll('[contenteditable="true"], textarea, [data-text="true"]')).find(e => {
            const r = e.getBoundingClientRect();
            return r.width > 100 && r.height > 0;
          });
          if (ed) {
            ed.focus();
            // Clear default text (the video filename)
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
            return true;
          }
          return false;
        })()`, returnByValue: true
      });
      console.log('Focused:', focused.result?.value);
      await wait(500);

      console.log('⌨️ Typing text using CDP Input.insertText...');
      await call('Input.insertText', { text: COPY_TT });
      await wait(3000);

      const ss = await call('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\tiktok_test_insert.png', Buffer.from(ss.data, 'base64'));
      console.log('📸 Screenshot saved to C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\tiktok_test_insert.png');

      ws.close();
    });
  });
});
