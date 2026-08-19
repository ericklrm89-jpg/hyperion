const WebSocket = require('ws');
const fs = require('fs');

async function finalizeInstagramShare() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/8DCE7D7DE1D3A719A57FB399CF446F4A');
  await new Promise((res) => ws.on('open', res));

  let cdpId = 1;
  const cdpCall = (method, params = {}) => new Promise((resolve, reject) => {
    const id = cdpId++;
    const handler = (data) => {
      try {
        const r = JSON.parse(data);
        if (r.id === id) {
          ws.removeListener('message', handler);
          if (r.error) reject(new Error(JSON.stringify(r.error)));
          else resolve(r.result || {});
        }
      } catch (e) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  console.log('Sending double Escape to close dropdown/popups...');
  await cdpCall('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', windowsVirtualKeyCode: 27 });
  await cdpCall('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', windowsVirtualKeyCode: 27 });
  await new Promise(r => setTimeout(r, 400));
  await cdpCall('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', windowsVirtualKeyCode: 27 });
  await cdpCall('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', windowsVirtualKeyCode: 27 });
  await new Promise(r => setTimeout(r, 800));

  console.log('Clicking Compartir button...');
  await cdpCall('Runtime.evaluate', {
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const share = btns.find(b => {
          const t = (b.textContent || '').trim().toLowerCase();
          const r = b.getBoundingClientRect();
          return (t === 'compartir' || t === 'share') && r.top < 200 && r.left > 500;
        });
        if (share) {
          share.click();
          return 'Clicked header share';
        }
        // Fallback: any visible share button
        const anyShare = btns.find(b => {
          const t = (b.textContent || '').trim().toLowerCase();
          return t === 'compartir' || t === 'share';
        });
        if (anyShare) {
          anyShare.click();
          return 'Clicked fallback share';
        }
        return 'Not found';
      })()
    `
  });

  console.log('Waiting 10s for upload to complete...');
  await new Promise(r => setTimeout(r, 10000));

  const ss = await cdpCall('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\ig_final_published.png', Buffer.from(ss.data, 'base64'));
  console.log('Screenshot saved to ig_final_published.png');

  ws.close();
}

finalizeInstagramShare().catch(console.error);
