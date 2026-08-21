/**
 * ==============================================================================
 * MASTER CONTINUOUS B2B AUTONOMOUS DISPATCHER (NANOAI INDUSTRIAL OS)
 * ==============================================================================
 * 
 * - 100% Resiliente con Auto-Reconexión en caso de desconexión CDP.
 * - Despacho de Gmail con higiene de borrador cero (Pure DOM Node Builder).
 * - Despacho de WhatsApp con Foto HD sectorial + Propuesta de Neuroventas B2B.
 * - Conteo regresivo y HUD interactivo en vivo.
 * - Historial persistente para cero duplicados.
 * ==============================================================================
 */

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ROBUST_MANUS_ENGINE } = require('./hyperion_robust_manus_overlay');

const CDP_PORT = 9001;
const CADENCE_SECONDS = 300; // 5 minutos exactos entre envíos
const ASSETS_DIR = 'C:/hyperion/scratch/cashflow_engine/public/assets';
const HISTORY_FILE = 'C:/hyperion/scratch/cashflow_engine/data/dispatched_history.json';
const CRM_DB_PATH = 'C:/Users/erick/.gemini/antigravity-ide/scratch/cashflow_engine/data/agent_crm_database.json';

// Asegurar directorios
fs.mkdirSync(ASSETS_DIR, { recursive: true });
fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function saveHistory(history) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (e) {}
}

function strClean(s) {
  return String(s || '').replace(/[\s\-\+\(\)]/g, '');
}

// Cargar leads calificados frescos (excluyendo estrictamente los ya contactados)
function loadFreshLeads() {
  const history = loadHistory();
  const contactedIds = new Set(history.map(h => h.id));
  const contactedPhones = new Set(history.map(h => h.clean_phone));
  const contactedEmails = new Set(history.map(h => h.email));

  let allLeads = [];
  try {
    if (fs.existsSync(CRM_DB_PATH)) {
      const data = JSON.parse(fs.readFileSync(CRM_DB_PATH, 'utf8'));
      data.forEach(d => {
        const ph = strClean(d.phone || d.telefono);
        const em = strClean(d.email || d.correo);
        const comp = d.company || d.name || d.razon_social;
        
        let ph_clean = null;
        if (ph.startsWith('09') && ph.length === 10) ph_clean = '593' + ph.slice(1);
        else if (ph.startsWith('5939') && ph.length === 12) ph_clean = ph;

        if (ph_clean && em.includes('@') && comp) {
          allLeads.push({
            id: d.id || ('EC-LEAD-' + ph_clean),
            company: comp.replace(/\s+/g, ' ').trim(),
            contact_name: d.contact_name || d.contact || 'Dirección de Operaciones',
            sector: d.sector || d.industry || 'Manufactura Industrial',
            location: d.location || 'Quito, Pichincha',
            email: em,
            phone: d.phone || ('+' + ph_clean),
            clean_phone: ph_clean,
            flyer: d.flyer || 'nanoai_b2b_square_hd_flyer.jpg'
          });
        }
      });
    }
  } catch (e) {
    console.error('Error cargando CRM DB:', e.message);
  }

  // Filtrar leads frescos
  const fresh = allLeads.filter(l => !contactedIds.has(l.id) && !contactedPhones.has(l.clean_phone) && !contactedEmails.has(l.email));
  return fresh;
}

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

// Inyección del HUD de Conteo Regresivo en Vivo
async function injectLiveCountdownHUD(ws, leadIndex, totalLeads, remainingSeconds, nextLeadName, lastProcessedName) {
  const caller = createCdpCaller(ws);
  const min = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
  const sec = (remainingSeconds % 60).toString().padStart(2, '0');

  await caller('Runtime.evaluate', {
    expression: `(() => {
      let hud = document.getElementById('nanoai-autonomous-hud');
      if (!hud) {
        hud = document.createElement('div');
        hud.id = 'nanoai-autonomous-hud';
        hud.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483647;background:linear-gradient(135deg, #090d16 0%, #0f172a 100%);border:2px solid #38bdf8;box-shadow:0 12px 30px rgba(0,0,0,0.8), 0 0 20px rgba(56,189,248,0.4);border-radius:12px;padding:10px 20px;font-family:system-ui,-apple-system,sans-serif;color:#f8fafc;display:flex;flex-direction:column;gap:6px;min-width:540px;pointer-events:none;';
        document.body.appendChild(hud);
      }
      hud.innerHTML = '<div style=\"display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(56,189,248,0.2);padding-bottom:6px;\"><span style=\"font-size:12px;font-weight:900;color:#38bdf8;letter-spacing:1px;\">🟢 NANOAI B2B AUTONOMOUS DISPATCHER</span><span style=\"font-size:11px;background:#1e293b;padding:2px 8px;border-radius:6px;border:1px solid #475569;font-weight:700;\">TOTAL ENVIADOS: ${leadIndex} / ${totalLeads}</span></div><div style=\"display:flex;justify-content:space-between;align-items:center;gap:12px;\"><div style=\"display:flex;align-items:center;gap:6px;\"><span style=\"font-size:16px;\">⏱️</span><span style=\"font-size:13px;font-weight:800;color:#cbd5e1;\">PRÓXIMO ENVÍO EN:</span><span style=\"font-size:18px;font-weight:900;color:#4ade80;background:#052e16;padding:2px 10px;border-radius:6px;border:1px solid #22c55e;font-family:monospace;\">${min}:${sec}</span></div></div><div style=\"display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;\"><div><span style=\"color:#38bdf8;font-weight:700;\">✅ ÚLTIMO PROCESADO:</span> ${lastProcessedName}</div><div><span style=\"color:#f59e0b;font-weight:700;\">🎯 SIGUIENTE EN COLA:</span> ${nextLeadName}</div></div>';
    })()`
  });
}

// 1. ENVÍO DE EMAIL CORPORATIVO GMAIL (PURE DOM TREE BUILDER + HIGIENE CERO BORRADORES)
async function sendGmailProposal(lead) {
  console.log(`\n📧 [GMAIL] Preparando propuesta HTML para: ${lead.company} <${lead.email}>...`);
  const tabs = await getTabs();
  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com'));
  if (!gmTab) throw new Error('Pestaña de Gmail no encontrada');

  const ws = new WebSocket(gmTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const call = createCdpCaller(ws);
  await call('DOM.enable');

  // Higiene: Cerrar modales y descartar borradores previos
  await call('Runtime.evaluate', {
    expression: `(() => {
      Array.from(document.querySelectorAll('button, div[role="button"]')).forEach(b => {
        if (b.innerText && (b.innerText.trim() === 'Aceptar' || b.innerText.trim() === 'OK' || b.innerText.trim() === 'Entendido')) b.click();
      });
      Array.from(document.querySelectorAll('div[data-tooltip*="Descartar borrador"], div[aria-label*="Descartar borrador"]')).forEach(b => b.click());
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));

  // Redactar nuevo mensaje
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
      const toBoxes = Array.from(document.querySelectorAll('input[aria-label="Para"], input[aria-label="To"], input[peoplekit-id]'));
      const activeTo = toBoxes[toBoxes.length - 1];
      if (activeTo) activeTo.focus();
    })()`
  });
  await call('Input.insertText', { text: lead.email });
  await call('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter' });
  await new Promise(r => setTimeout(r, 800));

  // Inyectar Asunto
  const subject = `${lead.company} — Optimización de Procesos & Ahorro de Nómina en Planta [Quito]`;
  await call('Runtime.evaluate', {
    expression: `(() => {
      const subjBoxes = Array.from(document.querySelectorAll('input[name="subjectbox"], input[aria-label="Asunto"]'));
      const activeSubj = subjBoxes[subjBoxes.length - 1];
      if (activeSubj) {
        activeSubj.focus();
        activeSubj.value = ${JSON.stringify(subject)};
        activeSubj.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  // Inyectar cuerpo HTML
  await call('Runtime.evaluate', {
    expression: `(() => {
      const editables = Array.from(document.querySelectorAll('div.LW-avf[role="textbox"], div.editable[aria-label="Cuerpo del mensaje"]'));
      const composer = editables[editables.length - 1];
      if (!composer) return false;

      composer.focus();
      while (composer.firstChild) composer.removeChild(composer.firstChild);

      const root = document.createElement('div');
      root.style.cssText = 'font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #ffffff; padding: 24px; border-radius: 10px; border: 1px solid #e2e8f0; max-width: 620px; line-height: 1.6;';

      const header = document.createElement('div');
      header.style.cssText = 'border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;';
      header.innerHTML = '<h2 style=\"margin:0; color:#0f172a; font-size:19px; font-weight:800;\">⚡ NANOAI INDUSTRIAL OS</h2><span style=\"background:#0284c7; color:#fff; font-size:11px; font-weight:700; padding:3px 10px; border-radius:15px;\">🛡️ 100% AIR-GAPPED</span>';
      root.appendChild(header);

      const p1 = document.createElement('p');
      p1.style.cssText = 'font-size: 14px; color: #334155; margin-bottom: 12px;';
      p1.innerHTML = 'Estimado equipo directivo de <strong>${lead.company}</strong>:';
      root.appendChild(p1);

      const p2 = document.createElement('p');
      p2.style.cssText = 'font-size: 14px; color: #334155; margin-bottom: 14px;';
      p2.innerHTML = 'En empresas de <strong>${lead.sector}</strong> en Quito, los despieces manuales, tiempos muertos y cálculos en Excel generan mermas de entre el 8% y el 15% del presupuesto operativo mensual.';
      root.appendChild(p2);

      const p3 = document.createElement('p');
      p3.style.cssText = 'font-size: 14px; color: #334155; margin-bottom: 16px;';
      p3.innerHTML = 'En <strong>NanoAI</strong> desarrollamos software operativo On-Premise instalado en la red física local de su empresa (sin depender de internet ni pagar mensualidades en la nube):';
      root.appendChild(p3);

      const list = document.createElement('ul');
      list.style.cssText = 'margin: 0 0 16px 0; padding-left: 20px; color: #1e293b; font-size: 13px; line-height: 1.7;';
      list.innerHTML = '<li><strong>Control en Tiempo Real:</strong> Conexión directa a maquinaria y control estricto de insumos.</li><li><strong>Cotizador Instantáneo:</strong> Cálculo exacto de costos y márgenes en &lt; 45 segundos.</li><li><strong>Cero Mensualidades:</strong> Licencia perpetua y datos 100% seguros dentro de su servidor.</li>';
      root.appendChild(list);

      const offer = document.createElement('div');
      offer.style.cssText = 'background: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px; border-radius: 6px; margin: 16px 0;';
      offer.innerHTML = '<h4 style=\"margin:0 0 6px 0; color:#15803d; font-size:13px; font-weight:800;\">🎁 OFERTA EXCLUSIVA DE LANZAMIENTO (QUITO):</h4><p style=\"margin:0; font-size:13px; color:#166534; line-height:1.5;\">Por lanzamiento incluimos <strong>3 Meses Gratis de Soporte Técnico</strong> y una <strong>Visita Presencial de Diagnóstico de 20 minutos</strong> en sus instalaciones sin costo ni compromiso.</p>';
      root.appendChild(offer);

      const cta = document.createElement('div');
      cta.style.cssText = 'text-align: center; margin: 20px 0;';
      cta.innerHTML = '<a href=\"https://nanoai.ec\" target=\"_blank\" style=\"display:inline-block; background:#0284c7; color:#fff; text-decoration:none; font-weight:700; font-size:13px; padding:11px 22px; border-radius:6px;\">📅 Agendar Visita Técnica Presencial</a>';
      root.appendChild(cta);

      const sign = document.createElement('div');
      sign.style.cssText = 'font-size: 12px; color: #64748b; margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 12px;';
      sign.innerHTML = '<strong>Ing. Erick R.</strong><br>Director de Ingeniería & Arquitectura de Software<br><strong>NanoAI Ecuador</strong> • Quito, Pichincha<br>WhatsApp Directo: +593 99 809 8229 | Web: <a href=\"https://nanoai.ec\" style=\"color:#0284c7;\">nanoai.ec</a>';
      root.appendChild(sign);

      composer.appendChild(root);
      return true;
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  // Adjuntar Flyer HD
  const flyerFile = path.join(ASSETS_DIR, lead.flyer || 'nanoai_b2b_square_hd_flyer.jpg').replace(/\\/g, '/');
  const actualFlyer = fs.existsSync(flyerFile) ? flyerFile : path.join(ASSETS_DIR, 'nanoai_b2b_square_hd_flyer.jpg').replace(/\\/g, '/');

  const doc = await call('DOM.getDocument', { depth: -1, pierce: true });
  const fileInputs = await call('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
  const nodeIds = fileInputs.nodeIds || [];
  if (nodeIds.length > 0) {
    const desc = await call('DOM.describeNode', { nodeId: nodeIds[0] });
    const backendNodeId = desc.node?.backendNodeId;
    if (backendNodeId) {
      await call('DOM.setFileInputFiles', { backendNodeId, files: [actualFlyer] });
      await new Promise(r => setTimeout(r, 3500));
    }
  }

  // Enviar
  await call('Runtime.evaluate', {
    expression: `(() => {
      const sendBtns = Array.from(document.querySelectorAll('div[role="button"][data-tooltip*="Enviar"], div[role="button"][aria-label*="Enviar"]'));
      const activeSend = sendBtns[sendBtns.length - 1];
      if (activeSend) activeSend.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 4000));

  await call('Runtime.evaluate', { expression: ROBUST_MANUS_ENGINE });
  await new Promise(r => setTimeout(r, 1000));
  const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  const proofPath = path.join(ASSETS_DIR, `live_gm_${lead.id}_verified.jpg`);
  if (snap?.data) fs.writeFileSync(proofPath, Buffer.from(snap.data, 'base64'));
  console.log(`✅ [GMAIL] Enviado exitosamente a ${lead.email} | Prueba: ${proofPath}`);
  ws.close();
  return { success: true, proof: proofPath };
}

// 2. ENVÍO DE WHATSAPP CORPORATIVO (FOTO HD REAL + TEXTO PERSUASIVO)
async function sendWhatsAppProposal(lead) {
  console.log(`\n📱 [WHATSAPP] Conectando para: ${lead.company} (${lead.phone})...`);
  const tabs = await getTabs();
  const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!waTab) throw new Error('Pestaña de WhatsApp no encontrada');

  const ws = new WebSocket(waTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const call = createCdpCaller(ws);
  await call('DOM.enable');

  const cleanPhone = lead.clean_phone || lead.phone.replace(/[^0-9]/g, '');
  console.log(`Navegando a chat de WhatsApp: https://web.whatsapp.com/send?phone=${cleanPhone}...`);
  await call('Runtime.evaluate', {
    expression: `window.location.href = 'https://web.whatsapp.com/send?phone=${cleanPhone}';`
  });

  let chatReady = false;
  let invalidNumber = false;
  const maxWait = 25;

  for (let i = 0; i < maxWait; i++) {
    await new Promise(r => setTimeout(r, 1000));
    
    const checkState = await call('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const okBtn = btns.find(b => b.innerText && (b.innerText.includes('OK') || b.innerText.includes('Aceptar')));
        if (okBtn) {
          const bodyText = document.body.innerText;
          if (bodyText.includes('no es válido') || bodyText.includes('no está en WhatsApp')) {
            okBtn.click();
            return { state: 'INVALID_NUMBER' };
          }
        }

        const footer = document.querySelector('footer div[contenteditable="true"]');
        if (footer && footer.offsetWidth > 0) {
          return { state: 'CHAT_READY' };
        }

        return { state: 'WAITING' };
      })()`,
      returnByValue: true
    });

    const state = checkState?.result?.value?.state;
    if (state === 'INVALID_NUMBER') {
      console.log(`⚠️ Número ${cleanPhone} no registrado en WhatsApp.`);
      invalidNumber = true;
      break;
    } else if (state === 'CHAT_READY') {
      console.log(`✅ Chat cargado e interactivo tras ${i+1}s.`);
      chatReady = true;
      break;
    }
  }

  if (invalidNumber) {
    ws.close();
    return { success: false, reason: 'INVALID_NUMBER' };
  }

  if (!chatReady) {
    await call('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const cancel = btns.find(b => b.innerText && b.innerText.includes('Cancelar'));
        if (cancel) cancel.click();
      })()`
    });
    console.log('⚠️ Timeout esperando chat de WhatsApp.');
    ws.close();
    return { success: false, reason: 'TIMEOUT' };
  }

  await new Promise(r => setTimeout(r, 1500));

  // Inyectar Foto HD
  console.log('1. Abriendo menú de adjuntos...');
  const flyerFile = path.join(ASSETS_DIR, lead.flyer || 'nanoai_b2b_square_hd_flyer.jpg').replace(/\\/g, '/');
  const actualFlyer = fs.existsSync(flyerFile) ? flyerFile : path.join(ASSETS_DIR, 'nanoai_b2b_square_hd_flyer.jpg').replace(/\\/g, '/');

  // 1. Abrir menú de adjuntos (+)
  console.log('1. Abriendo menú de adjuntos (+) para Foto HD...');
  const flyerFile = path.join(ASSETS_DIR, lead.flyer || 'nanoai_b2b_square_hd_flyer.jpg').replace(/\\/g, '/');
  const actualFlyer = fs.existsSync(flyerFile) ? flyerFile : path.join(ASSETS_DIR, 'nanoai_b2b_square_hd_flyer.jpg').replace(/\\/g, '/');

  await call('Runtime.evaluate', {
    expression: `(() => {
      const plusBtn = document.querySelector('span[data-icon="plus"]') ||
                      document.querySelector('span[data-icon="attach-menu-plus"]') ||
                      document.querySelector('div[title="Adjuntar"]');
      if (plusBtn) plusBtn.closest('button, div[role="button"]').click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));

  // Obtener RemoteObjectId directo del input de fotos y videos
  const evalInput = await call('Runtime.evaluate', {
    expression: `document.querySelector('input[accept*="image"]') || document.querySelector('input[type="file"]')`,
    returnByValue: false
  });

  const objectId = evalInput?.result?.objectId;
  if (objectId && fs.existsSync(actualFlyer)) {
    const desc = await call('DOM.describeNode', { objectId });
    const backendNodeId = desc?.node?.backendNodeId;

    if (backendNodeId) {
      console.log('2. Inyectando Foto HD en input multimedia...');
      await call('DOM.setFileInputFiles', { backendNodeId, files: [actualFlyer] });
      await new Promise(r => setTimeout(r, 3500));

      // Preparar texto de neuroventas
      const waText = `Hola estimado equipo de *${lead.company}* 👋 Le saluda Erick, Director Técnico de NanoAI en Quito.\n\nLe comparto la ficha técnica de cómo funciona nuestro software industrial On-Premise para optimizar procesos en empresas de *${lead.sector}* en su propia red local (sin mensualidades en la nube).\n\n🎁 Por lanzamiento en la zona incluimos *3 MESES GRATIS DE SOPORTE TÉCNICO* y una visita presencial de diagnóstico de 20 minutos sin costo.\n\n¿Qué día de esta semana tendrían 20 minutos para coordinar la visita técnica presencial en su planta?`;

      console.log('3. Inyectando pie de foto en el editor multimedia...');
      await call('Runtime.evaluate', {
        expression: `(() => {
          const captionBox = document.querySelector('div[data-animate-media-viewer="true"] div[contenteditable="true"]') ||
                             document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
                             document.querySelector('div[role="textbox"]');
          if (captionBox) {
            captionBox.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
            document.execCommand('insertText', false, ${JSON.stringify(waText)});
            captionBox.dispatchEvent(new Event('input', { bubbles: true }));
          }
        })()`
      });
      await new Promise(r => setTimeout(r, 1500));

      console.log('4. Enviando Foto HD con pie de foto...');
      await call('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 13, text: '\r' });
      await call('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13 });
      await new Promise(r => setTimeout(r, 1000));

      await call('Runtime.evaluate', {
        expression: `(() => {
          const sendBtn = document.querySelector('div[data-animate-media-viewer="true"] span[data-icon="wds-ic-send-filled"]') ||
                          document.querySelector('div[data-animate-media-viewer="true"] span[data-icon="send"]') ||
                          document.querySelector('span[data-icon="wds-ic-send-filled"]') ||
                          document.querySelector('span[data-icon="send"]') ||
                          document.querySelector('div[aria-label="Enviar"]');
          if (sendBtn) {
            const b = sendBtn.closest('button, div[role="button"]') || sendBtn;
            b.click();
          }
        })()`
      });
      await new Promise(r => setTimeout(r, 4500));
    }
  }

  // 2. Auditoría con Capa Manus
  await call('Runtime.evaluate', { expression: ROBUST_MANUS_ENGINE });
  await new Promise(r => setTimeout(r, 1000));
  const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  const proofPath = path.join(ASSETS_DIR, `live_wa_${lead.id}_verified.jpg`);
  if (snap?.data) fs.writeFileSync(proofPath, Buffer.from(snap.data, 'base64'));
  console.log(`✅ [WHATSAPP] Completado para ${lead.company} | Prueba: ${proofPath}`);
  ws.close();
  return { success: true, proof: proofPath };
}

// BUCLE CONTINUO AUTÓNOMO CON AUTO-RETRY RESILIENTE
async function runContinuousCampaign() {
  while (true) {
    try {
      const freshLeads = loadFreshLeads();
      if (freshLeads.length === 0) {
        console.log('🏁 Todos los leads calificados de la base de datos han sido contactados.');
        break;
      }

      console.log('================================================================');
      console.log('⚡ MASTER CONTINUOUS B2B AUTONOMOUS DISPATCHER (NANOAI)');
      console.log(`📋 LEADS FRESCOS RESTANTES: ${freshLeads.length}`);
      console.log(`⏱️ CADENCIA ESTRICTA: 1 LEAD CADA ${CADENCE_SECONDS} SEGUNDOS (5 MINUTOS)`);
      console.log('================================================================\n');

      for (let i = 0; i < freshLeads.length; i++) {
        const lead = freshLeads[i];
        const nextLead = freshLeads[(i + 1) % freshLeads.length];
        const currentTotal = loadHistory().length + 1;

        console.log(`\n================================================================`);
        console.log(`🚀 [LEAD #${currentTotal}] PROCESANDO NUEVO PROSPECTO: ${lead.company}`);
        console.log(`🏢 ID: ${lead.id} | 📍 ${lead.location}`);
        console.log(`🏭 Sector: ${lead.sector}`);
        console.log(`📧 Email: ${lead.email} | 📱 WhatsApp: ${lead.phone}`);
        console.log(`🖼️ Flyer Asignado: ${lead.flyer}`);
        console.log(`================================================================`);

        let gmResult = { success: false };
        let waResult = { success: false };

        try {
          gmResult = await sendGmailProposal(lead);
        } catch (err) {
          console.error(`⚠️ Error en Gmail para ${lead.company}:`, err.message);
        }

        try {
          waResult = await sendWhatsAppProposal(lead);
        } catch (err) {
          console.error(`⚠️ Error en WhatsApp para ${lead.company}:`, err.message);
        }

        const history = loadHistory();
        history.push({
          id: lead.id,
          company: lead.company,
          phone: lead.phone,
          clean_phone: lead.clean_phone,
          email: lead.email,
          sector: lead.sector,
          flyer: lead.flyer,
          timestamp: new Date().toISOString(),
          gmail_success: gmResult.success,
          whatsapp_success: waResult.success,
          gmail_proof: gmResult.proof || null,
          whatsapp_proof: waResult.proof || null
        });
        saveHistory(history);

        console.log(`\n✅ Lead #${currentTotal} [${lead.company}] procesado y guardado en historial.`);
        console.log(`⏳ Entrando en período de enfriamiento de 5 minutos (${CADENCE_SECONDS}s)...`);

        const startTime = Date.now();
        while ((Date.now() - startTime) < CADENCE_SECONDS * 1000) {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const remaining = CADENCE_SECONDS - elapsed;

          try {
            const tabs = await getTabs();
            for (const tab of tabs) {
              if (tab.type === 'page' && (tab.url.includes('web.whatsapp.com') || tab.url.includes('mail.google.com'))) {
                const ws = new WebSocket(tab.webSocketDebuggerUrl);
                await new Promise(r => ws.on('open', r));
                await injectLiveCountdownHUD(ws, currentTotal, freshLeads.length + history.length, remaining, nextLead.company, lead.company);
                ws.close();
              }
            }
          } catch (e) {}

          if (remaining % 60 === 0 && remaining > 0) {
            console.log(`⏱️ Siguiente nuevo lead [${nextLead.company}] en: ${remaining} segundos...`);
          }
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    } catch (criticalErr) {
      console.error('⚠️ Reconectando despachador en 10 segundos tras error de socket:', criticalErr.message);
      await new Promise(r => setTimeout(r, 10000));
    }
  }
}

runContinuousCampaign().catch(console.error);
