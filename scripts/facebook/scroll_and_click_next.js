const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const COPY_FB = `🎉 ¡Sorteos 100% Transparentes y Verificados con IA!

FairDraw utiliza Inteligencia Artificial para garantizar que cada sorteo sea provadamente justo y auditado. Sin trucos ni manipulaciones — solo confianza total. 🛡️

🌐 fairdrawapp.com

#FairDraw #Sorteos #InteligenciaArtificial #Transparencia #FairPlay #Tecnologia #Confianza #SorteosOnline #GanaPremios`;

async function main() {
  const tabs = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error',rej);
  });
  const tab = tabs.find(t => t.type==='page' && t.url.includes('facebook.com'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));

  let cdpId = 1;
  const cdpCall = (method, params = {}) => new Promise((resolve, reject) => {
    const id = cdpId++;
    const h = (data) => {
      const r = JSON.parse(data);
      if (r.id === id) { ws.off('message', h); r.error ? reject(new Error(JSON.stringify(r.error))) : resolve(r.result || {}); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });

  const mouseClick = async (x, y) => {
    await cdpCall('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await new Promise(r => setTimeout(r, 80));
    await cdpCall('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await new Promise(r => setTimeout(r, 80));
    await cdpCall('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };

  console.log('Finding and scrolling Next / Siguiente button into view...');
  const nextBtnPos = await cdpCall('Runtime.evaluate', {
    expression: `(() => {
      const all = Array.from(document.querySelectorAll('div[role="button"], button, span'));
      const target = all.find(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'siguiente' || txt === 'next') && r.width > 0;
      });
      if (target) {
        target.scrollIntoView({ block: 'center', inline: 'center' });
        const r = target.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`, returnByValue: true
  });

  console.log('Next button position:', nextBtnPos.result?.value);
  if (nextBtnPos.result?.value) {
    const p = JSON.parse(nextBtnPos.result.value);
    console.log(`Clicking Next at x=${p.x}, y=${p.y}...`);
    await mouseClick(p.x, p.y);
    await new Promise(r => setTimeout(r, 4000));
  }

  // Check state after click
  const ss1 = await cdpCall('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_step2_clicked.png', Buffer.from(ss1.data, 'base64'));

  // Write Caption
  console.log('Writing Spanish caption...');
  await cdpCall('Runtime.evaluate', {
    expression: `(() => {
      const ed = document.querySelector('div[contenteditable="true"], textarea');
      if (ed) {
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(COPY_FB)});
        ed.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  // Find and click Publish / Post / Publicar
  const pubBtnPos = await cdpCall('Runtime.evaluate', {
    expression: `(() => {
      const all = Array.from(document.querySelectorAll('div[role="button"], button, span'));
      const target = all.find(e => {
        const txt = (e.textContent || '').trim().toLowerCase();
        const r = e.getBoundingClientRect();
        return (txt === 'publicar' || txt === 'publish' || txt === 'post') && r.width > 0;
      });
      if (target) {
        target.scrollIntoView({ block: 'center', inline: 'center' });
        const r = target.getBoundingClientRect();
        return JSON.stringify({ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) });
      }
      return null;
    })()`, returnByValue: true
  });

  console.log('Publish button position:', pubBtnPos.result?.value);
  if (pubBtnPos.result?.value) {
    const p = JSON.parse(pubBtnPos.result.value);
    console.log(`Clicking Publish at x=${p.x}, y=${p.y}...`);
    await mouseClick(p.x, p.y);
    await new Promise(r => setTimeout(r, 10000));
  }

  const ss2 = await cdpCall('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_published_step3.png', Buffer.from(ss2.data, 'base64'));
  console.log('📸 Screenshot saved: fb_published_step3.png');

  ws.close();
}

main().catch(console.error);
