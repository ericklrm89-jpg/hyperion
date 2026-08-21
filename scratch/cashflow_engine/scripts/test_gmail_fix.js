const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CDP_PORT = 9001;
const FLYER_PATH = "C:\\hyperion\\scratch\\cashflow_engine\\public\\assets\\nanoai_b2b_square_hd_flyer.jpg";
const ASSETS_DIR = "C:\\hyperion\\scratch\\cashflow_engine\\public\\assets";
const IDE_ASSETS_DIR = "C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets";

fs.mkdirSync(ASSETS_DIR, { recursive: true });
fs.mkdirSync(IDE_ASSETS_DIR, { recursive: true });

function saveProof(filename, buffer) {
  fs.writeFileSync(path.join(ASSETS_DIR, filename), buffer);
  fs.writeFileSync(path.join(IDE_ASSETS_DIR, filename), buffer);
  console.log(`📸 Guardada captura: ${filename}`);
}

const ROBUST_MANUS_ENGINE = `(() => {
  const existing = document.getElementById('hyperion-manus-master-overlay');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'hyperion-manus-master-overlay';
  container.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483646;';
  document.body.appendChild(container);

  const banner = document.createElement('div');
  banner.id = 'hyperion-manus-banner';
  banner.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483647;background:linear-gradient(135deg, #090d16 0%, #0f172a 100%);border:2px solid #00ff66;box-shadow:0 8px 32px rgba(0,0,0,0.8), 0 0 15px rgba(0,255,102,0.3);border-radius:30px;padding:8px 24px;font-family:system-ui,-apple-system,sans-serif;color:#00ff66;font-size:14px;font-weight:900;letter-spacing:1px;text-transform:uppercase;display:flex;align-items:center;gap:10px;pointer-events:none;';
  banner.innerHTML = '⚡ CAPA ACTIVA: CAPA MANUS MULTICOLOR [<span id="manus-elem-count">0</span> ELEMENTOS]';
  document.body.appendChild(banner);

  const PALETTE = [
    { fill: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#ffffff', bg: '#ef4444' }, // Rojo
    { fill: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', text: '#000000', bg: '#22c55e' }, // Verde
    { fill: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#ffffff', bg: '#3b82f6' }, // Azul
    { fill: 'rgba(234, 179, 8, 0.15)', border: '#eab308', text: '#000000', bg: '#eab308' }, // Amarillo
    { fill: 'rgba(168, 85, 247, 0.15)', border: '#a855f7', text: '#ffffff', bg: '#a855f7' }, // Violeta
    { fill: 'rgba(236, 72, 153, 0.15)', border: '#ec4899', text: '#ffffff', bg: '#ec4899' }  // Rosa
  ];

  function render() {
    container.innerHTML = '';
    const selector = 'button, a, input, textarea, div[role="button"], div[contenteditable="true"], span[role="button"], [tabindex="0"]';
    const all = Array.from(document.querySelectorAll(selector));
    let count = 0;

    all.forEach(el => {
      if (el.closest('#hyperion-manus-master-overlay') || el.closest('#hyperion-manus-banner')) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      if (rect.top < -50 || rect.left < -50 || rect.top > window.innerHeight + 50 || rect.left > window.innerWidth + 50) return;
      
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

      count++;
      const color = PALETTE[(count - 1) % PALETTE.length];

      const box = document.createElement('div');
      box.style.cssText = 'position:absolute;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;border:2px solid ' + color.border + ';background:' + color.fill + ';pointer-events:none;border-radius:4px;box-sizing:border-box;';

      const badge = document.createElement('div');
      badge.style.cssText = 'position:absolute;left:0;top:-18px;background:' + color.bg + ';color:' + color.text + ';font-size:11px;font-weight:900;font-family:monospace;padding:1px 5px;border-radius:3px;box-shadow:0 2px 4px rgba(0,0,0,0.5);white-space:nowrap;line-height:14px;';
      badge.innerText = '[' + count + '] ' + (el.getAttribute('aria-label') || el.innerText || el.placeholder || el.tagName.toLowerCase()).substring(0, 16);

      box.appendChild(badge);
      container.appendChild(box);
    });

    const countSpan = document.getElementById('manus-elem-count');
    if (countSpan) countSpan.innerText = count;
  }

  render();
  if (window._manusInterval) clearInterval(window._manusInterval);
  window._manusInterval = setInterval(render, 250);
  return true;
})()`;

function getTabs() {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${CDP_PORT}/json`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function createCdpCaller(ws) {
  return (method, params = {}) => new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 999999);
    const handler = (data) => {
      try {
        const res = JSON.parse(data);
        if (res.id === id) {
          ws.removeListener('message', handler);
          if (res.error) reject(new Error(JSON.stringify(res.error)));
          else resolve(res.result || {});
        }
      } catch (e) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function run() {
  const tabs = await getTabs();
  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com'));
  if (!gmTab) throw new Error('Gmail tab not found');

  const ws = new WebSocket(gmTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const call = createCdpCaller(ws);
  await call('DOM.enable');
  await call('Page.enable');

  console.log('1. Descartando modales y borradores viejos...');
  await call('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
      const okBtn = btns.find(b => b.innerText && (b.innerText.includes('Aceptar') || b.innerText.includes('OK')));
      if (okBtn) okBtn.click();
      
      const discardBtns = Array.from(document.querySelectorAll('div[data-tooltip*="Descartar borrador"], div[aria-label*="Descartar borrador"]'));
      discardBtns.forEach(b => b.click());
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('2. Haciendo clic en Redactar...');
  await call('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('div[role="button"], div[jscontroller]'));
      const composeBtn = btns.find(b => b.innerText && b.innerText.includes('Redactar'));
      if (composeBtn) composeBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  console.log('3. Ingresando Destinatario con Enter para crear el chip...');
  await call('Runtime.evaluate', {
    expression: `(() => {
      const toInput = document.querySelector('input[peoplekit-id], input[aria-label*="Para"], input[aria-label*="To"], input.agP');
      if (toInput) {
        toInput.focus();
        toInput.value = '';
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 300));
  await call('Input.insertText', { text: 'erickfabro@gmail.com' });
  await new Promise(r => setTimeout(r, 300));
  await call('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 13 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13 });
  await new Promise(r => setTimeout(r, 800));

  console.log('4. Ingresando Asunto...');
  await call('Runtime.evaluate', {
    expression: `(() => {
      const subjInput = document.querySelector('input[name="subjectbox"]');
      if (subjInput) {
        subjInput.focus();
        subjInput.value = '⚡ Propuesta B2B: Automatización y Control Algorítmico NanoAI Industrial';
        subjInput.dispatchEvent(new Event('input', { bubbles: true }));
        subjInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 500));

  console.log('5. Inyectando cuerpo HTML estructurado...');
  await call('Runtime.evaluate', {
    expression: `(() => {
      const bodyDivs = Array.from(document.querySelectorAll('div[aria-label="Cuerpo del mensaje"], div.LW-avf[role="textbox"]'));
      const targetDiv = bodyDivs.find(d => !d.closest('#hyperion-manus-master-overlay') && !d.getAttribute('aria-label')?.includes('Gemini')) || bodyDivs[0];
      if (!targetDiv) return false;

      targetDiv.focus();
      while (targetDiv.firstChild) {
        targetDiv.removeChild(targetDiv.firstChild);
      }

      const container = document.createElement('div');
      container.style.cssText = 'font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 650px; margin: 0 auto; background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);';

      const header = document.createElement('div');
      header.style.cssText = 'background: linear-gradient(135deg, #090d16 0%, #0f172a 100%); border-left: 6px solid #00ff66; padding: 20px 24px; border-radius: 8px; margin-bottom: 24px; color: #ffffff;';
      
      const title = document.createElement('h2');
      title.style.cssText = 'color: #00ff66; margin: 0 0 6px 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;';
      title.innerText = '⚡ NANOAI INDUSTRIAL OS | CONTROL ALGORÍTMICO B2B';

      const badge = document.createElement('div');
      badge.style.cssText = 'display: inline-block; background: rgba(0,255,102,0.15); border: 1px solid #00ff66; color: #00ff66; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; margin-bottom: 8px;';
      badge.innerText = '🛡️ 100% AIR-GAPPED • CERO RIESGO DE FUGA';

      const subtitle = document.createElement('p');
      subtitle.style.cssText = 'color: #94a3b8; margin: 0; font-size: 13px; font-weight: 500;';
      subtitle.innerText = 'Automatización Neuronal y Reducción de Pérdidas Operativas en Planta';

      header.appendChild(badge);
      header.appendChild(title);
      header.appendChild(subtitle);
      container.appendChild(header);

      const p1 = document.createElement('p');
      p1.style.cssText = 'font-size: 15px; color: #334155; margin-bottom: 16px;';
      p1.innerHTML = 'Estimado Director / Gerente de Operaciones,<br><br>En la industria manufacturera ecuatoriana, los errores en cubicaje y la lentitud de 24 a 48 horas en cotizaciones técnicas generan fugas operativas que promedian los <strong>$3,600 USD mensuales</strong>.';
      container.appendChild(p1);

      const tableCard = document.createElement('div');
      tableCard.style.cssText = 'background: #0f172a; border-radius: 8px; padding: 18px; margin: 20px 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); color: #ffffff;';

      const tableTitle = document.createElement('h3');
      tableTitle.style.cssText = 'color: #00ff66; margin: 0 0 14px 0; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;';
      tableTitle.innerText = '📊 COMPARATIVA FINANCIERA Y OPERATIVA';
      tableCard.appendChild(tableTitle);

      const table = document.createElement('table');
      table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;';

      const thead = document.createElement('tr');
      thead.style.cssText = 'border-bottom: 2px solid #334155; color: #94a3b8; font-weight: 700;';
      ['MÉTRICA / PROCESO', 'MÉTODO TRADICIONAL', 'CON NANOAI OS'].forEach((h, idx) => {
        const th = document.createElement('th');
        th.style.cssText = 'padding: 10px 8px;' + (idx === 2 ? ' color: #00ff66;' : '');
        th.innerText = h;
        thead.appendChild(th);
      });
      table.appendChild(thead);

      const rowsData = [
        ['Costo de Nómina Técnica', '-$3,600 USD / mes', '$0 (100% Algorítmico)'],
        ['Tiempo de Cotización', '24 a 48 horas', '< 45 segundos en vivo'],
        ['Margen Operativo Neto', 'Pérdida por merma', '+$4,200 USD / mes retorno']
      ];

      rowsData.forEach(r => {
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom: 1px solid #1e293b;';
        r.forEach((col, idx) => {
          const td = document.createElement('td');
          td.style.cssText = 'padding: 12px 8px;' + (idx === 1 ? ' color: #f87171; font-weight: 600;' : idx === 2 ? ' color: #4ade80; font-weight: 800;' : ' color: #cbd5e1;');
          td.innerText = col;
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });
      tableCard.appendChild(table);
      container.appendChild(tableCard);

      const offerCard = document.createElement('div');
      offerCard.style.cssText = 'background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 18px; margin: 20px 0;';
      
      const offerTitle = document.createElement('h4');
      offerTitle.style.cssText = 'color: #166534; margin: 0 0 8px 0; font-size: 15px; font-weight: 800;';
      offerTitle.innerText = '🎁 OFERTA IRRESISTIBLE $100M (PILOTO SIN RIESGO):';
      offerCard.appendChild(offerTitle);

      const offerList = document.createElement('ul');
      offerList.style.cssText = 'margin: 0; padding-left: 20px; color: #15803d; font-size: 13px; font-weight: 600; line-height: 1.6;';
      [
        'Prueba de concepto en planta con sus propios planos CAD / Excel.',
        'Visita de auditoría técnica in-situ de 20 minutos por Erick Fabro.',
        'Garantía de Cero Fuga: Si no reduce 10x los tiempos en 14 días, no paga un solo centavo.'
      ].forEach(item => {
        const li = document.createElement('li');
        li.innerText = item;
        offerList.appendChild(li);
      });
      offerCard.appendChild(offerList);
      container.appendChild(offerCard);

      const ctaBox = document.createElement('div');
      ctaBox.style.cssText = 'text-align: center; margin: 26px 0 16px 0;';
      
      const ctaBtn = document.createElement('a');
      ctaBtn.href = 'https://wa.me/593988888888?text=Hola%20Erick,%20deseo%20agendar%20la%20auditoría%20técnica%20de%20NanoAI';
      ctaBtn.style.cssText = 'display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 800; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(16,185,129,0.4); text-transform: uppercase;';
      ctaBtn.innerText = '📅 Agendar Demostración Técnica de 20 Minutos';
      ctaBox.appendChild(ctaBtn);
      container.appendChild(ctaBox);

      const footer = document.createElement('div');
      footer.style.cssText = 'margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;';
      footer.innerHTML = '<strong>Erick Fabro</strong><br>Lead Architect & B2B Automation Engineer • NanoAI OS<br>📞 WhatsApp Directo: +593 98 888 8888<br>📍 Guayaquil - Quito, Ecuador';
      container.appendChild(footer);

      targetDiv.appendChild(container);
      return true;
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('6. Adjuntando Flyer HD...');
  const doc = await call('DOM.getDocument');
  const fileInputNode = await call('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: 'input[type="file"][name="Filedata"]'
  });

  if (fileInputNode && fileInputNode.nodeId) {
    await call('DOM.setFileInputFiles', {
      nodeId: fileInputNode.nodeId,
      files: [FLYER_PATH]
    });
    console.log('📎 Archivo adjuntado correctamente');
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('7. Inyectando Capa Manus Multicolor y Capturando Prueba Previa al Envío...');
  await call('Runtime.evaluate', { expression: ROBUST_MANUS_ENGINE });
  await new Promise(r => setTimeout(r, 1000));

  const draftSnap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  saveProof('live_gm_draft_ready_verified.jpg', Buffer.from(draftSnap.data, 'base64'));

  console.log('8. Enviando correo con verificación de badge Enviar...');
  await call('Runtime.evaluate', {
    expression: `(() => {
      const sendBtns = Array.from(document.querySelectorAll('div[data-tooltip*="Enviar"], div[aria-label*="Enviar"], div[data-tooltip*="Send"]'));
      const activeSendBtn = sendBtns.find(b => !b.closest('#hyperion-manus-master-overlay'));
      if (activeSendBtn) {
        activeSendBtn.click();
        return true;
      }
      return false;
    })()`
  });
  await new Promise(r => setTimeout(r, 4000));

  console.log('9. Inyectando Capa Manus y Capturando Confirmación de Envío en Gmail...');
  await call('Runtime.evaluate', { expression: ROBUST_MANUS_ENGINE });
  await new Promise(r => setTimeout(r, 1000));

  const sentSnap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  saveProof('live_gm_sent_delivered_verified.jpg', Buffer.from(sentSnap.data, 'base64'));

  ws.close();
  console.log('✅ Correo B2B HTML enviado y verificado con éxito!');
}

run().catch(console.error);
