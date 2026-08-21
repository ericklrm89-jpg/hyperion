const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CDP_PORT = 9001;
const ASSETS_DIR = 'C:/hyperion/scratch/cashflow_engine/public/assets';

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

// Helper: Esperar a que un selector esté presente y visible en el DOM
async function waitForSelector(call, selector, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await call('Runtime.evaluate', {
      expression: `(() => {
        const el = document.querySelector('${selector}');
        if (el && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0)) {
          return true;
        }
        return false;
      })()`,
      returnByValue: true
    });
    if (res?.result?.value) return true;
    await new Promise(r => setTimeout(r, 800));
  }
  return false;
}

// 1. ENVÍO DE EMAIL ELEGANTE EN GMAIL
async function sendExecutiveGmail(lead) {
  console.log(`\n📧 [GMAIL] Iniciando envío para: ${lead.company} <${lead.email}>...`);
  const tabs = await getTabs();
  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com'));
  if (!gmTab) throw new Error('Pestaña de Gmail no encontrada');

  const ws = new WebSocket(gmTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const call = createCdpCaller(ws);
  await call('DOM.enable');

  // Redactar nuevo
  await call('Runtime.evaluate', {
    expression: `(() => {
      const composeBtn = document.querySelector('div[role="button"][gh="cm"]') ||
                         Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText && (b.innerText.includes('Redactar') || b.innerText.includes('Compose')));
      if (composeBtn) composeBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  // Inyectar destinatario
  await call('Runtime.evaluate', {
    expression: `(() => {
      const toBox = document.querySelector('input[aria-label="Para"]') ||
                    document.querySelector('input[aria-label="To"]') ||
                    document.querySelector('input[peoplekit-id]');
      if (toBox) toBox.focus();
    })()`
  });
  await call('Input.insertText', { text: lead.email });
  await call('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
  await new Promise(r => setTimeout(r, 800));

  // Inyectar Asunto personalizado
  const subject = `${lead.company} — Optimización de Procesos & Ahorro de Nómina en Planta [Quito]`;
  await call('Runtime.evaluate', {
    expression: `(() => {
      const subjBox = document.querySelector('input[name="subjectbox"]') ||
                      document.querySelector('input[aria-label="Asunto"]');
      if (subjBox) {
        subjBox.focus();
        subjBox.value = ${JSON.stringify(subject)};
        subjBox.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  // Inyectar cuerpo HTML ejecutivo
  await call('Runtime.evaluate', {
    expression: `(() => {
      const editables = Array.from(document.querySelectorAll('div.LW-avf[role="textbox"], div.editable[aria-label="Cuerpo del mensaje"]'));
      const composer = editables[editables.length - 1];
      if (!composer) return false;

      composer.focus();
      while (composer.firstChild) composer.removeChild(composer.firstChild);

      const root = document.createElement('div');
      root.style.cssText = 'font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #ffffff; padding: 24px; border-radius: 10px; border: 1px solid #e2e8f0; max-width: 620px; line-height: 1.6;';

      // Header
      const header = document.createElement('div');
      header.style.cssText = 'border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;';
      header.innerHTML = '<h2 style=\"margin:0; color:#0f172a; font-size:19px; font-weight:800;\">⚡ NANOAI INDUSTRIAL OS</h2><span style=\"background:#0284c7; color:#fff; font-size:11px; font-weight:700; padding:3px 10px; border-radius:15px;\">🛡️ 100% AIR-GAPPED</span>';
      root.appendChild(header);

      // Saludo
      const p1 = document.createElement('p');
      p1.style.cssText = 'font-size: 14px; color: #334155; margin-bottom: 12px;';
      p1.innerHTML = 'Estimado equipo directivo de <strong>${lead.company}</strong>:';
      root.appendChild(p1);

      const p2 = document.createElement('p');
      p2.style.cssText = 'font-size: 14px; color: #334155; margin-bottom: 14px;';
      p2.innerHTML = 'En empresas de <strong>${lead.sector}</strong> en Quito, los despieces manuales, tiempos muertos y cálculos en Excel generan mermas de entre el 8% y el 15% del presupuesto operativo mensual.';
      root.appendChild(p2);

      // Solución
      const p3 = document.createElement('p');
      p3.style.cssText = 'font-size: 14px; color: #334155; margin-bottom: 16px;';
      p3.innerHTML = 'En <strong>NanoAI</strong> desarrollamos software operativo On-Premise instalado en la red física local de su empresa (sin depender de internet ni pagar mensualidades en la nube):';
      root.appendChild(p3);

      // Beneficios
      const list = document.createElement('ul');
      list.style.cssText = 'margin: 0 0 16px 0; padding-left: 20px; color: #1e293b; font-size: 13px; line-height: 1.7;';
      list.innerHTML = '<li><strong>Control en Tiempo Real:</strong> Conexión directa a maquinaria y control estricto de insumos.</li><li><strong>Cotizador Instantáneo:</strong> Cálculo exacto de costos y márgenes en &lt; 45 segundos.</li><li><strong>Cero Mensualidades:</strong> Licencia perpetua y datos 100% seguros dentro de su servidor.</li>';
      root.appendChild(list);

      // Oferta Hormozi
      const offer = document.createElement('div');
      offer.style.cssText = 'background: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px; border-radius: 6px; margin: 16px 0;';
      offer.innerHTML = '<h4 style=\"margin:0 0 6px 0; color:#15803d; font-size:13px; font-weight:800;\">🎁 OFERTA EXCLUSIVA DE LANZAMIENTO (QUITO):</h4><p style=\"margin:0; font-size:13px; color:#166534; line-height:1.5;\">Por lanzamiento incluimos <strong>3 Meses Gratis de Soporte Técnico</strong> y una <strong>Visita Presencial de Diagnóstico de 20 minutos</strong> en sus instalaciones sin costo ni compromiso.</p>';
      root.appendChild(offer);

      // CTA
      const cta = document.createElement('div');
      cta.style.cssText = 'text-align: center; margin: 20px 0;';
      cta.innerHTML = '<a href=\"https://nanoai.ec\" target=\"_blank\" style=\"display:inline-block; background:#0284c7; color:#fff; text-decoration:none; font-weight:700; font-size:13px; padding:11px 22px; border-radius:6px;\">📅 Agendar Visita Técnica Presencial</a>';
      root.appendChild(cta);

      // Firma
      const sign = document.createElement('div');
      sign.style.cssText = 'font-size: 12px; color: #64748b; margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 12px;';
      sign.innerHTML = '<strong>Ing. Erick R.</strong><br>Director de Ingeniería & Arquitectura de Software<br><strong>NanoAI Ecuador</strong> • Quito, Pichincha<br>WhatsApp Directo: +593 99 809 8229 | Web: <a href=\"https://nanoai.ec\" style=\"color:#0284c7;\">nanoai.ec</a>';
      root.appendChild(sign);

      composer.appendChild(root);
      return true;
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  // Adjuntar Flyer
  const flyerFile = path.join(ASSETS_DIR, lead.flyer || 'nanoai_b2b_square_hd_flyer.jpg').replace(/\\/g, '/');
  const actualFlyer = fs.existsSync(flyerFile) ? flyerFile : path.join(ASSETS_DIR, 'nanoai_b2b_square_hd_flyer.jpg').replace(/\\/g, '/');

  const doc = await call('DOM.getDocument', { depth: -1, pierce: true });
  const fileInputs = await call('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  if (fileInputs.nodeIds && fileInputs.nodeIds.length > 0) {
    const desc = await call('DOM.describeNode', { nodeId: fileInputs.nodeIds[0] });
    if (desc.node?.backendNodeId) {
      await call('DOM.setFileInputFiles', { backendNodeId: desc.node.backendNodeId, files: [actualFlyer] });
      await new Promise(r => setTimeout(r, 3500));
    }
  }

  // Clic en Enviar
  await call('Runtime.evaluate', {
    expression: `(() => {
      const sendBtn = document.querySelector('div[role="button"][data-tooltip*="Enviar"]') ||
                      document.querySelector('div[role="button"][aria-label*="Enviar"]') ||
                      Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText === 'Enviar');
      if (sendBtn) sendBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 4000));

  const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  const proofPath = path.join(ASSETS_DIR, `live_gm_${lead.id}_verified.jpg`);
  if (snap?.data) fs.writeFileSync(proofPath, Buffer.from(snap.data, 'base64'));
  console.log(`✅ [GMAIL] Enviado exitosamente a ${lead.email} | Prueba: ${proofPath}`);
  ws.close();
}

// 2. ENVÍO DE WHATSAPP IMPECABLE (FOTO HD REAL + TEXTO PERSUASIVO)
async function sendExecutiveWhatsApp(lead) {
  console.log(`\n📱 [WHATSAPP] Iniciando chat con: ${lead.company} (${lead.phone})...`);
  const tabs = await getTabs();
  const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!waTab) throw new Error('Pestaña de WhatsApp no encontrada');

  const ws = new WebSocket(waTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const call = createCdpCaller(ws);
  await call('DOM.enable');

  const cleanPhone = (lead.clean_phone || lead.phone).replace(/[^0-9]/g, '');
  
  // Navegar al chat directo
  await call('Runtime.evaluate', {
    expression: `window.location.href = 'https://web.whatsapp.com/send?phone=${cleanPhone}';`
  });

  // Esperar a que el chat cargue y esté listo (máximo 25s)
  console.log('Esperando carga completa del chat en WhatsApp...');
  const chatReady = await waitForSelector(call, 'footer div[contenteditable="true"]', 25000);
  if (!chatReady) {
    console.log('⚠️ Chat tardó en cargar, esperando 5s adicionales...');
    await new Promise(r => setTimeout(r, 5000));
  } else {
    console.log('Chat cargado e hidratado.');
    await new Promise(r => setTimeout(r, 2000));
  }

  // 1. Subir Foto HD (Flyer)
  console.log('1. Abriendo selector de archivos de WhatsApp...');
  const flyerFile = path.join(ASSETS_DIR, lead.flyer || 'nanoai_b2b_square_hd_flyer.jpg').replace(/\\/g, '/');
  const actualFlyer = fs.existsSync(flyerFile) ? flyerFile : path.join(ASSETS_DIR, 'nanoai_b2b_square_hd_flyer.jpg').replace(/\\/g, '/');

  let doc = await call('DOM.getDocument', { depth: -1, pierce: true });
  let fileInputs = await call('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[accept*="image"]' });

  if (!fileInputs.nodeIds || fileInputs.nodeIds.length === 0) {
    // Clic en botón +
    await call('Runtime.evaluate', {
      expression: `(() => {
        const plusBtn = document.querySelector('span[data-icon="plus"]') ||
                        document.querySelector('span[data-icon="attach-menu-plus"]') ||
                        document.querySelector('div[title="Adjuntar"]');
        if (plusBtn) plusBtn.closest('button, div[role="button"]').click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1500));
    doc = await call('DOM.getDocument', { depth: -1, pierce: true });
    fileInputs = await call('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[accept*="image"]' });
  }

  const nodeIds = fileInputs.nodeIds || [];
  if (nodeIds.length > 0) {
    const desc = await call('DOM.describeNode', { nodeId: nodeIds[0] });
    if (desc.node?.backendNodeId) {
      console.log('2. Inyectando Foto HD...');
      await call('DOM.setFileInputFiles', { backendNodeId: desc.node.backendNodeId, files: [actualFlyer] });
      
      // Esperar a que el visor de fotos abra
      console.log('3. Esperando apertura del visor de fotos...');
      const viewerReady = await waitForSelector(call, 'span[data-icon="wds-ic-send-filled"], span[data-icon="send"]', 10000);
      await new Promise(r => setTimeout(r, 1500));

      // Inyectar caption sutil
      const photoCaption = `⚡ Ficha Técnica On-Premise — Optimización para ${lead.company}`;
      await call('Runtime.evaluate', {
        expression: `(() => {
          const captionBox = document.querySelector('div[data-animate-media-viewer="true"] div[contenteditable="true"]') ||
                             document.querySelector('div[aria-label*="pie de foto"]') ||
                             document.querySelector('div[aria-label*="pie de página"]') ||
                             Array.from(document.querySelectorAll('div[contenteditable="true"]')).pop();
          if (captionBox) {
            captionBox.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
            document.execCommand('insertText', false, ${JSON.stringify(photoCaption)});
            captionBox.dispatchEvent(new Event('input', { bubbles: true }));
          }
        })()`
      });
      await new Promise(r => setTimeout(r, 1000));

      // Clic en Enviar la Foto HD
      console.log('4. Enviando Foto HD...');
      await call('Runtime.evaluate', {
        expression: `(() => {
          const sendIcon = document.querySelector('span[data-icon="wds-ic-send-filled"]') ||
                           document.querySelector('span[data-icon="send"]') ||
                           document.querySelector('div[aria-label*="Enviar"]');
          if (sendIcon) {
            const btn = sendIcon.closest('button, div[role="button"]') || sendIcon;
            btn.click();
          }
        })()`
      });
      await new Promise(r => setTimeout(r, 4500));
    }
  }

  // 2. Escribir Propuesta de Alto Impacto (Neuroventas B2B)
  console.log('5. Escribiendo propuesta de neuroventas en el chat...');
  const waLines = [
    `Hola estimado equipo de *${lead.company}* 👋 Le saluda Erick, Director Técnico de NanoAI en Quito.`,
    "",
    `Le escribo porque desarrollamos sistemas operativos locales instalados en red física (sin mensualidades ni depender de internet) para empresas de *${lead.sector}* en Quito, automatizando el control de mermas y cotizaciones instantáneas.`,
    "",
    `📊 Arriba le comparto la ficha técnica de cómo opera directamente en planta.`,
    "",
    `🎁 Por inauguración en la zona incluimos *3 MESES GRATIS DE SOPORTE TÉCNICO* y una visita presencial de diagnóstico de 20 minutos en sus instalaciones sin costo.`,
    "",
    `¿Qué día de esta semana tendrían 20 minutos para coordinar la visita técnica presencial en su empresa?`
  ];

  await call('Runtime.evaluate', {
    expression: `(() => {
      const editables = Array.from(document.querySelectorAll('footer div[contenteditable="true"], div[contenteditable="true"]'));
      const composer = editables[editables.length - 1];
      if (composer) composer.focus();
    })()`
  });

  for (let i = 0; i < waLines.length; i++) {
    const line = waLines[i];
    if (line.length > 0) {
      await call('Input.insertText', { text: line });
    }
    if (i < waLines.length - 1) {
      await call('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 8, windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
      await call('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 8, windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
      await new Promise(r => setTimeout(r, 30));
    }
  }
  await new Promise(r => setTimeout(r, 1000));

  // Enviar mensaje de texto
  console.log('6. Enviando mensaje de texto...');
  await call('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
  await new Promise(r => setTimeout(r, 4000));

  const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  const proofPath = path.join(ASSETS_DIR, `live_wa_${lead.id}_verified.jpg`);
  if (snap?.data) fs.writeFileSync(proofPath, Buffer.from(snap.data, 'base64'));
  console.log(`✅ [WHATSAPP] Enviado exitosamente a ${lead.phone} | Prueba: ${proofPath}`);
  ws.close();
}

// Lead de prueba fresco
const TEST_LEAD = {
  id: "EC-PYME-00001",
  company: "PITEX S.A. (Tejidos & Confección)",
  contact_name: "Gerencia de Planta & Confección",
  sector: "Tejidos, Confección Textil & Uniformes",
  email: "ventas@tejidospitex.com",
  phone: "+593998634974",
  clean_phone: "593998634974",
  location: "Quito, Pichincha",
  flyer: "nanoai_asoprotexdor_textiles_flyer.jpg"
};

async function testSingleLead() {
  console.log('=== TEST DE ENVÍO INDIVIDUAL IMPECABLE ===');
  await sendExecutiveGmail(TEST_LEAD);
  await sendExecutiveWhatsApp(TEST_LEAD);
  console.log('=== TEST COMPLETADO CON ÉXITO ===');
}

testSingleLead().catch(console.error);
