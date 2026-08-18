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

  console.log('Clicking Next blue button at x=175, y=840...');
  await mouseClick(175, 840);
  await new Promise(r => setTimeout(r, 3000));

  const ss1 = await cdpCall('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_step3_caption_unlocked.png', Buffer.from(ss1.data, 'base64'));

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

  console.log('Clicking Publish blue button at x=175, y=840...');
  await mouseClick(175, 840);
  await new Promise(r => setTimeout(r, 12000));

  const ss2 = await cdpCall('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\fb_published_final_confirmed.png', Buffer.from(ss2.data, 'base64'));
  console.log('📸 Screenshot saved: fb_published_final_confirmed.png');

  ws.close();
}

main().catch(console.error);
