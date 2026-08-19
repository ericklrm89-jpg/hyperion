const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

let cdpId = 1;
function cdpCall(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = cdpId++;
    const h = (data) => {
      try {
        const r = JSON.parse(data);
        if (r.id === id) {
          ws.removeListener('message', h);
          r.error ? reject(new Error(JSON.stringify(r.error))) : resolve(r.result || {});
        }
      } catch(e) {}
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

const ART = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\brain\\a24ce018-a2c0-4cb7-905d-2c0a339916ea';
const FILES = [
  path.join(ART, 'fairdraw_storyboard_pt_1_1785181462270.png'),
  path.join(ART, 'fairdraw_storyboard_pt_2_1785181480081.png'),
  path.join(ART, 'fairdraw_storyboard_pt_3_1785181517992.png')
];

async function main() {
  console.log('🚀 Iniciando inyección directa de archivos en Gemini Web...');
  const tabs = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d)));
    }).on('error', rej);
  });
  
  const tab = tabs.find(t => t.type === 'page' && t.url.includes('gemini.google.com'));
  if (!tab) throw new Error('No se encontró la pestaña de Gemini Web');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(res => ws.on('open', res));
  await cdpCall(ws, 'Page.enable');
  await cdpCall(ws, 'DOM.enable');
  await cdpCall(ws, 'Page.bringToFront');
  await wait(1000);

  // 1. Obtener el input file del DOM
  console.log('👇 Buscando el elemento input[type="file"] en el DOM de Gemini...');
  const doc = await cdpCall(ws, 'DOM.getDocument');
  const inpNode = await cdpCall(ws, 'DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  
  if (!inpNode || !inpNode.nodeId) {
    throw new Error('No se encontró el elemento input file oculto en la página');
  }
  
  const ni = await cdpCall(ws, 'DOM.describeNode', { nodeId: inpNode.nodeId });
  console.log('🎯 Elemento input file detectado. BackendNodeId:', ni.node.backendNodeId);

  // 2. Inyectar los archivos directamente
  console.log('📤 Subiendo archivos de forma directa...');
  await cdpCall(ws, 'DOM.setFileInputFiles', {
    backendNodeId: ni.node.backendNodeId,
    files: FILES
  });
  console.log('✅ Archivos inyectados con éxito. Esperando subida (8s)...');
  await wait(8000);

  // 3. Escribir el prompt en portugués en el editor
  console.log('✍️ Escribiendo prompt en el editor de chat...');
  const promptText = 'Por favor, anime estas 3 ilustrações verticais do aplicativo de sorteios de prêmios FairDraw. Crie uma animação de vídeo promocional vertical de 10 segundos (formato 9:16) com transições dinâmicas de motion graphics e uma locução animada em português de Brasil que explique que o FairDraw realiza sorteios 100% transparentes e auditados com Inteligência Artificial. O foco do vídeo deve ser inteiramente em design gráfico, animação e ilustração 3D, sem pessoas reais.';
  
  const writeRes = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const editor = document.querySelector('div[contenteditable="true"], textarea') || document.querySelector('[placeholder*="Gemini"], [placeholder*="pregunta"]');
      if (editor) {
        editor.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(promptText)});
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('   Resultado escritura prompt:', writeRes.result?.value);
  await wait(2000);

  // 4. Clic en enviar
  console.log('🚀 Enviando prompt a Gemini Web...');
  const sendClicked = await cdpCall(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
      const sendBtn = btns.find(b => {
        const aria = (b.getAttribute('aria-label')||'').toLowerCase();
        return aria.includes('enviar') || aria.includes('send') || aria.includes('mensaje');
      });
      if (sendBtn) {
        sendBtn.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });
  console.log('   Resultado enviar clic:', sendClicked.result?.value);
  await wait(5000);

  // Captura de control
  const ss = await cdpCall(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\hyperion-web-agent\\g_js_pt_prompt_escrito.png', Buffer.from(ss.data, 'base64'));
  console.log('📸 Captura de progreso guardada: g_js_pt_prompt_escrito.png');

  ws.close();
}
main().catch(console.error);
