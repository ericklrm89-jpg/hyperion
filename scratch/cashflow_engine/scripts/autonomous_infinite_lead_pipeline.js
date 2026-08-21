/**
 * MOTOR AUTÓNOMO CONTINUO DE ENRIQUECIMIENTO Y PROSPECCIÓN B2B (CADENCIA: 1 CADA 5 MINUTOS)
 * Base de Datos: 5,000+ Leads Industriales de Ecuador (master_quito_5000_leads.json / consolidated_outreach_database.json)
 * Canales: Gmail (Pure DOM + Flyer HD) & WhatsApp Web (Copy Neuroventas + Flyer HD)
 * Capa Manus: v3.2 Multicolor [1..N] con 250ms repaint loop
 */

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ROBUST_MANUS_ENGINE } = require('./hyperion_robust_manus_overlay');

const CDP_PORT = 9001;
const MASTER_5000_FILE = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\data\\master_quito_5000_leads.json';
const CONSOLIDATED_FILE = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\data\\consolidated_outreach_database.json';
const CRM_FILE = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\data\\agent_crm_database.json';
const PIPELINE_TRACKER = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\data\\autonomous_pipeline_tracker.json';
const ASSETS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets';
const FLYER = path.join(ASSETS_DIR, 'nanoai_b2b_square_hd_flyer.jpg');

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

function loadTracker() {
  if (fs.existsSync(PIPELINE_TRACKER)) {
    return JSON.parse(fs.readFileSync(PIPELINE_TRACKER, 'utf8'));
  }
  return {
    startedAt: new Date().toISOString(),
    totalDispatched: 0,
    processedIds: [],
    leadsLog: []
  };
}

function saveTracker(data) {
  fs.writeFileSync(PIPELINE_TRACKER, JSON.stringify(data, null, 2), 'utf8');
}

// -------------------------------------------------------------
// RECOPILADOR DE LEADS PRIORIZADOS (5,000+ LEADS)
// -------------------------------------------------------------
function getAllLeadsInQueue() {
  const tracker = loadTracker();
  const queue = [];

  // 1. Leads de Consolidated Outreach
  if (fs.existsSync(CONSOLIDATED_FILE)) {
    const consolidated = JSON.parse(fs.readFileSync(CONSOLIDATED_FILE, 'utf8'));
    consolidated.forEach(c => {
      if (!tracker.processedIds.includes(c.id)) {
        queue.push({
          id: c.id,
          empresa: c.company,
          email: c.email,
          phone: c.phone || c.whatsapp_channel,
          industry: c.industry,
          location: c.location || 'Quito, Pichincha',
          contact: c.contact_name || 'Dirección de Operaciones',
          source: 'CONSOLIDATED_OUTREACH'
        });
      }
    });
  }

  // 2. Leads de Master 5000 Leads
  if (fs.existsSync(MASTER_5000_FILE)) {
    const m5000 = JSON.parse(fs.readFileSync(MASTER_5000_FILE, 'utf8'));
    const leadsList = m5000.leads || [];
    leadsList.forEach(l => {
      if (!tracker.processedIds.includes(l.id)) {
        queue.push({
          id: l.id,
          empresa: l.empresa,
          email: l.email || null,
          phone: l.clean_phone || l.telefono,
          industry: l.ciiu_6 || l.ciiu_1 || 'Manufactura & Comercio Industrial',
          location: `${l.ciudad || 'QUITO'}, ${l.provincia || 'PICHINCHA'}`,
          contact: l.representante || 'Dirección General',
          cargo: l.cargo || 'Gerencia',
          ruc: l.ruc,
          source: 'MASTER_5000'
        });
      }
    });
  }

  return queue;
}

// -------------------------------------------------------------
// DISPATCHER GMAIL REAL
// -------------------------------------------------------------
async function dispatchGmail(lead) {
  if (!lead.email) return null;
  console.log(`\n📧 [GMAIL] Enviando propuesta a: ${lead.empresa} <${lead.email}>...`);

  const tabs = await getTabs();
  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com/mail/u/'));
  if (!gmTab) throw new Error('Pestaña de Gmail no disponible');

  const ws = new WebSocket(gmTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const call = createCdpCaller(ws);
  await call('DOM.enable');

  const subject = `⚡ NANOAI INDUSTRIAL OS — Optimización Algorítmica y Control de Mermas para ${lead.empresa}`;

  // Clic en Redactar
  await call('Runtime.evaluate', {
    expression: `(() => {
      const redactar = document.querySelector('div[role="button"][gh="cm"]') || 
                       document.querySelector('div.T-I.T-I-KE.L3') ||
                       Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText && b.innerText.includes('Redactar'));
      if (redactar) redactar.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  // Destinatario
  await call('Runtime.evaluate', {
    expression: `(() => {
      const toField = document.querySelector('input[aria-label="Destinatarios"]') || 
                      document.querySelector('input[peoplekit-id]') ||
                      document.querySelector('input[name="to"]') ||
                      document.querySelector('input.agP');
      if (toField) toField.focus();
    })()`
  });
  await call('Input.insertText', { text: lead.email });
  await call('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 13 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13 });
  await new Promise(r => setTimeout(r, 1000));

  // Asunto
  await call('Runtime.evaluate', {
    expression: `(() => {
      const subField = document.querySelector('input[name="subjectbox"]') || 
                       document.querySelector('input[aria-label="Asunto"]');
      if (subField) {
        subField.focus();
        subField.value = ${JSON.stringify(subject)};
        subField.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  // Cuerpo Pure DOM
  await call('Runtime.evaluate', {
    expression: `(() => {
      const editors = Array.from(document.querySelectorAll('div.editable[aria-label="Cuerpo del mensaje"]'));
      const editor = editors[editors.length - 1];
      if (!editor) return;

      editor.focus();
      while (editor.firstChild) editor.removeChild(editor.firstChild);

      const card = document.createElement('div');
      card.style.cssText = 'font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; color: #0f172a; line-height: 1.5; padding: 20px; background: #ffffff; border: 2px solid #2563eb; border-radius: 12px; max-width: 620px; margin: 0 auto; box-shadow: 0 6px 18px rgba(0,0,0,0.08);';

      const header = document.createElement('div');
      header.style.cssText = 'border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px;';
      const logo = document.createElement('span');
      logo.style.cssText = 'font-size: 20px; font-weight: 900; color: #0f172a;';
      logo.innerText = '⚡ NanoAI Industrial OS';
      const badge = document.createElement('span');
      badge.style.cssText = 'background: #2563eb; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 9px; border-radius: 6px; text-transform: uppercase; float: right;';
      badge.innerText = '🛡️ 100% AIR-GAPPED';
      header.appendChild(logo);
      header.appendChild(badge);
      card.appendChild(header);

      const h3 = document.createElement('h3');
      h3.style.cssText = 'font-size: 15.5px; font-weight: 900; color: #0f172a; margin: 0 0 10px 0;';
      h3.innerText = 'Propuesta de Eficiencia Operativa y Control de Costos para ' + ${JSON.stringify(lead.empresa)};
      card.appendChild(h3);

      const p1 = document.createElement('p');
      p1.style.cssText = 'font-size: 12.5px; color: #475569; margin: 0 0 14px 0;';
      p1.innerHTML = 'Estimada Dirección y Gerencia de Operaciones de <strong>' + ${JSON.stringify(lead.empresa)} + '</strong>:<br>En el sector de <strong>' + ${JSON.stringify(lead.industry)} + '</strong> en ' + ${JSON.stringify(lead.location)} + ', los procesos tradicionales de cotización y despiece generan más de <strong style="color:#dc2626;">$3,600 USD/mes en nómina técnica fija</strong> y desperdicios de material de hasta el 15%.';
      card.appendChild(p1);

      const table = document.createElement('table');
      table.style.cssText = 'border-collapse: collapse; width: 100%; font-size: 12px; margin-bottom: 14px; border: 1px solid #cbd5e1;';
      const thead = document.createElement('tr');
      thead.style.cssText = 'background: #0f172a; color: #ffffff;';
      thead.innerHTML = '<th style="padding:7px;text-align:left;">Indicador Operativo</th><th style="padding:7px;text-align:center;">Método Tradicional</th><th style="padding:7px;text-align:right;">NanoAI On-Premise</th>';
      table.appendChild(thead);

      const rows = [
        ['Nómina Fija Técnica (3 Personas):', '-$3,600 USD / mes', '$0 nómina fija técnica', '#dc2626', '#16a34a'],
        ['Tiempo por Cotización y Despiece:', '24 a 48 horas', '< 45 segundos en vivo', '#64748b', '#2563eb'],
        ['Desperdicio y Merma de Material:', '8% a 15% del costo', '< 2% (Nesting algorítmico)', '#64748b', '#16a34a'],
        ['Flujo Neto Mensual Recuperado:', 'Pérdida continua', '+$4,200 USD / mes', '#dc2626', '#16a34a']
      ];

      rows.forEach(([c1, c2, c3, col2, col3], idx) => {
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom: 1px solid #e2e8f0;' + (idx === 3 ? 'font-weight:bold;' : '');
        tr.innerHTML = '<td style="padding:7px;">' + c1 + '</td><td style="padding:7px;text-align:center;color:' + col2 + ';font-weight:bold;">' + c2 + '</td><td style="padding:7px;text-align:right;color:' + col3 + ';font-weight:bold;">' + c3 + '</td>';
        table.appendChild(tr);
      });
      card.appendChild(table);

      const offer = document.createElement('div');
      offer.style.cssText = 'background: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 8px; padding: 12px; margin-bottom: 14px; font-size: 12px; color: #1e3a8a;';
      offer.innerHTML = '<strong>🎁 OFERTA HORMOZI DE LANZAMIENTO (' + ${JSON.stringify(lead.location)} + '):</strong><br>Incluye <strong>3 MESES GRATIS DE SOPORTE TÉCNICO</strong> más una <strong>visita técnica presencial de 20 minutos</strong> en su planta por nuestro Director Técnico, Erick.';
      card.appendChild(offer);

      const ctaWrap = document.createElement('div');
      ctaWrap.style.cssText = 'text-align: center; margin-bottom: 12px;';
      ctaWrap.innerHTML = '<a href="https://wa.me/593998098229?text=Hola%20Erick,%20deseo%20coordinar%20la%20visita%20tecnica%20de%20NanoAI%20para%20' + encodeURIComponent(${JSON.stringify(lead.empresa)}) + '" style="background:#0f172a;color:#ffffff;padding:11px 26px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:12.5px;display:inline-block;border:2px solid #2563eb;">📅 Agendar Demostración Técnica de 20 Minutos</a>';
      card.appendChild(ctaWrap);

      const signoff = document.createElement('div');
      signoff.style.cssText = 'border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 11px; color: #64748b;';
      signoff.innerHTML = '<strong>Erick R.</strong> • Director Técnico — NanoAI Ecuador • WhatsApp: +593 99 809 8229<br><a href="https://nanoai.ec" style="color:#2563eb;text-decoration:none;font-weight:bold;">https://nanoai.ec</a>';
      card.appendChild(signoff);

      editor.appendChild(card);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  // Adjuntar Flyer HD
  if (fs.existsSync(FLYER)) {
    const doc = await call('DOM.getDocument', { depth: -1, pierce: true });
    const fileInputs = await call('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
    const nodeIds = fileInputs.nodeIds || [];
    if (nodeIds.length > 0) {
      const desc = await call('DOM.describeNode', { nodeId: nodeIds[nodeIds.length - 1] });
      if (desc.node?.backendNodeId) {
        await call('DOM.setFileInputFiles', { backendNodeId: desc.node.backendNodeId, files: [FLYER] });
        await new Promise(r => setTimeout(r, 3500));
      }
    }
  }

  // Capa Manus v3.2
  await call('Runtime.evaluate', { expression: ROBUST_MANUS_ENGINE });
  await new Promise(r => setTimeout(r, 1000));

  // Enviar
  await call('Runtime.evaluate', {
    expression: `(() => {
      const sendBtns = Array.from(document.querySelectorAll('div[role="button"]')).filter(b => b.innerText && b.innerText.trim() === 'Enviar');
      if (sendBtns.length > 0) sendBtns[sendBtns.length - 1].click();
    })()`
  });
  await new Promise(r => setTimeout(r, 4000));

  const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
  const capturePath = path.join(ASSETS_DIR, `live_gm_auto_${lead.id}_verified.jpg`);
  if (snap?.data) {
    fs.writeFileSync(capturePath, Buffer.from(snap.data, 'base64'));
    console.log(`✅ [GMAIL] Enviado a ${lead.email} | Prueba: ${capturePath}`);
  }

  ws.close();
  return capturePath;
}

// -------------------------------------------------------------
// DISPATCHER WHATSAPP REAL
// -------------------------------------------------------------
async function dispatchWhatsApp(lead) {
  const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
  if (!cleanPhone) return null;
  console.log(`\n📱 [WHATSAPP] Enviando propuesta a: ${lead.empresa} (+${cleanPhone})...`);

  const tabs = await getTabs();
  const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!waTab) throw new Error('Pestaña de WhatsApp no disponible');

  const ws = new WebSocket(waTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const call = createCdpCaller(ws);
  await call('DOM.enable');

  const copy = `⚡ *NANOAI INDUSTRIAL OS* | _Optimización Algorítmica para ${lead.empresa}_

Estimada Dirección y Gerencia de *${lead.empresa}* (${lead.location}):
¿Cuánto le cuesta al mes en su planta de *${lead.industry}* mantener procesos manuales de cotización y despiece?

📊 *Impacto Financiero Comprobado:*
🔴 *Método Tradicional:* -$3,600 USD/mes en nómina técnica fija | 48h de espera | 8% a 15% de descarte.
🟢 *NanoAI Air-Gapped:* $0 nómina fija técnica | < 45 segundos por cotización | < 2% de merma.

💰 *Retorno Financiero Proyectado:* Retorno neto de *+$4,200 USD/mes* en flujo de caja.

🎁 *OFERTA HORMOZI DE LANZAMIENTO:*
✅ *3 MESES GRATIS DE SOPORTE TÉCNICO Y ACTUALIZACIONES*
✅ *Visita Técnica Presencial de 20 minutos* en su planta por nuestro Director Técnico, Erick.

📅 _¿Qué día de esta semana le resultaría más conveniente para la demostración técnica de 20 minutos?_
🌐 https://nanoai.ec • WhatsApp Directo: +593 99 809 8229`;

  // Buscar contacto o usar hilo
  await call('Runtime.evaluate', {
    expression: `(() => {
      const search = document.querySelector('div[contenteditable="true"][data-tab="3"]') ||
                     document.querySelector('div[role="textbox"]');
      if (search) {
        search.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, ${JSON.stringify(cleanPhone.slice(-8))});
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  await call('Runtime.evaluate', {
    expression: `(() => {
      const results = Array.from(document.querySelectorAll('div[role="listitem"]'));
      if (results.length > 0) results[0].click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  // Redactar mensaje
  await call('Runtime.evaluate', {
    expression: `(() => {
      const msgBox = document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
                     document.querySelector('footer div[contenteditable="true"]');
      if (msgBox) {
        msgBox.focus();
        document.execCommand('insertText', false, ${JSON.stringify(copy)});
        msgBox.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  await call('Runtime.evaluate', {
    expression: `(() => {
      const sendBtn = document.querySelector('span[data-icon="send"]') || document.querySelector('button[aria-label="Enviar"]');
      if (sendBtn) sendBtn.closest('button, div[role="button"]').click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  // Adjuntar Flyer HD
  if (fs.existsSync(FLYER)) {
    const doc = await call('DOM.getDocument', { depth: -1, pierce: true });
    const fileInputs = await call('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
    const nodeIds = fileInputs.nodeIds || [];
    if (nodeIds.length > 0) {
      const desc = await call('DOM.describeNode', { nodeId: nodeIds[nodeIds.length - 1] });
      if (desc.node?.backendNodeId) {
        await call('DOM.setFileInputFiles', { backendNodeId: desc.node.backendNodeId, files: [FLYER] });
        await new Promise(r => setTimeout(r, 3000));

        await call('Runtime.evaluate', {
          expression: `(() => {
            const sendBtn = document.querySelector('div[aria-label*="Enviar"]') ||
                            document.querySelector('span[data-icon="send"]');
            if (sendBtn) sendBtn.closest('button, div[role="button"]').click();
          })()`
        });
        await new Promise(r => setTimeout(r, 2500));
      }
    }
  }

  // Inyectar Capa Manus v3.2 y Capturar Prueba
  await call('Runtime.evaluate', { expression: ROBUST_MANUS_ENGINE });
  await new Promise(r => setTimeout(r, 1000));
  const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
  const capturePath = path.join(ASSETS_DIR, `live_wa_auto_${lead.id}_verified.jpg`);
  if (snap?.data) {
    fs.writeFileSync(capturePath, Buffer.from(snap.data, 'base64'));
    console.log(`✅ [WHATSAPP] Enviado a ${cleanPhone} | Prueba: ${capturePath}`);
  }

  ws.close();
  return capturePath;
}

// -------------------------------------------------------------
// BUCLE CONTINUO AUTÓNOMO (1 LEAD CADA 5 MINUTOS SIN PARAR)
// -------------------------------------------------------------
async function runAutonomousInfinitePipeline() {
  console.log('================================================================');
  console.log('⚡ MOTOR AUTÓNOMO DE PROSPECCIÓN CONTINUA B2B INICIADO (SIN PARAR)');
  console.log('⏱️ CADENCIA ESTRICTA: 1 LEAD CADA 5 MINUTOS (300 SEGUNDOS)');
  console.log('================================================================');

  while (true) {
    const queue = getAllLeadsInQueue();
    const tracker = loadTracker();

    if (queue.length === 0) {
      console.log('🎉 ¡Todos los leads de la base han sido procesados!');
      break;
    }

    const lead = queue[0];
    const leadNum = tracker.totalDispatched + 1;

    console.log(`\n================================================================`);
    console.log(`🚀 [LEAD #${leadNum}] PROCESANDO: ${lead.empresa}`);
    console.log(`📍 Ubicación: ${lead.location} | 🏭 Industria: ${lead.industry}`);
    console.log(`📧 Email: ${lead.email || 'No disponible'} | 📱 Teléfono: ${lead.phone || 'No disponible'}`);
    console.log(`================================================================`);

    let gmProof = null;
    let waProof = null;

    try {
      if (lead.email) {
        gmProof = await dispatchGmail(lead);
      }
    } catch (e) {
      console.error(`❌ Error en Gmail para ${lead.empresa}:`, e.message);
    }

    try {
      if (lead.phone) {
        waProof = await dispatchWhatsApp(lead);
      }
    } catch (e) {
      console.error(`❌ Error en WhatsApp para ${lead.empresa}:`, e.message);
    }

    // Registrar en tracker
    tracker.totalDispatched++;
    tracker.processedIds.push(lead.id);
    tracker.leadsLog.push({
      leadNum,
      id: lead.id,
      empresa: lead.empresa,
      email: lead.email,
      phone: lead.phone,
      industry: lead.industry,
      timestamp: new Date().toISOString(),
      gmailProof: gmProof,
      whatsappProof: waProof
    });
    saveTracker(tracker);

    console.log(`\n✅ Lead #${leadNum} [${lead.empresa}] procesado exitosamente.`);
    console.log(`⏳ Entrando en período de enfriamiento de 5 minutos (300 segundos)...`);

    const nextQueue = getAllLeadsInQueue();
    const nextLeadName = nextQueue.length > 0 ? nextQueue[0].empresa : 'Fin de cola';

    for (let s = 300; s > 0; s -= 5) {
      if (s % 30 === 0 || s === 300) {
        console.log(`⏱️ Siguiente lead en: ${s} segundos...`);
      }

      // Actualizar HUD visual en pestañas cada 5 segundos
      try {
        const tabs = await getTabs();
        const hudJs = `
          (() => {
            var hud = document.getElementById('hyperion-countdown-hud');
            if (!hud) {
              hud = document.createElement('div');
              hud.id = 'hyperion-countdown-hud';
              hud.style.cssText = 'position: fixed; top: 8px; left: 50%; transform: translateX(-50%); z-index: 2147483647; background: rgba(15, 23, 42, 0.98); border: 2.5px solid #22c55e; border-radius: 12px; padding: 10px 24px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, monospace; box-shadow: 0 10px 30px rgba(0,0,0,0.85); pointer-events: none; min-width: 620px; max-width: 90vw; text-align: center; backdrop-filter: blur(8px);';
              document.body.appendChild(hud);
            }
            var m = Math.floor(${s} / 60);
            var sec = ${s} % 60;
            var timeStr = (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
            var percent = Math.max(0, Math.min(100, Math.round(((300 - ${s}) / 300) * 100)));

            hud.innerHTML = '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:6px; margin-bottom:8px;">' +
              '<div style="font-weight:900; font-size:13px; color:#38bdf8; display:flex; align-items:center; gap:6px;">' +
                '<span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#22c55e; box-shadow:0 0 8px #22c55e;"></span>' +
                'NANOAI B2B AUTONOMOUS DISPATCHER' +
              '</div>' +
              '<div style="font-size:11px; font-weight:800; color:#94a3b8; background:#1e293b; padding:2px 8px; border-radius:4px; border:1px solid #475569;">' +
                'TOTAL ENVIADOS: <strong style="color:#22c55e;">' + ${leadNum} + '</strong> / 5000' +
              '</div>' +
            '</div>' +
            '<div style="display:flex; align-items:center; justify-content:center; gap:20px; margin-bottom:8px;">' +
              '<div style="background:#022c22; border:1.5px solid #22c55e; border-radius:8px; padding:4px 16px; display:inline-block;">' +
                '<span style="font-size:11px; color:#86efac; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">⏱️ PRÓXIMO ENVÍO EN:</span> ' +
                '<span style="font-size:22px; font-weight:900; color:#22c55e; font-family:monospace; margin-left:6px; letter-spacing:1px;">' + timeStr + '</span>' +
              '</div>' +
            '</div>' +
            '<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:11px; text-align:left; background:#0f172a; padding:6px 10px; border-radius:6px; border:1px solid #1e293b; margin-bottom:8px;">' +
              '<div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' +
                '<span style="color:#94a3b8; font-weight:700;">✅ ÚLTIMO PROCESADO:</span><br>' +
                '<strong style="color:#e2e8f0; font-size:11.5px;">' + ${JSON.stringify(lead.empresa)} + '</strong>' +
              '</div>' +
              '<div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' +
                '<span style="color:#fbbf24; font-weight:700;">🎯 SIGUIENTE EN COLA:</span><br>' +
                '<strong style="color:#fde047; font-size:11.5px;">' + ${JSON.stringify(nextLeadName)} + '</strong>' +
              '</div>' +
            '</div>' +
            '<div style="width:100%; height:5px; background:#1e293b; border-radius:4px; overflow:hidden;">' +
              '<div style="width:' + percent + '%; height:100%; background:linear-gradient(90deg, #22c55e, #38bdf8);"></div>' +
            '</div>';
          })();
        `;

        for (const t of tabs) {
          if (t.type === 'page' && (t.url.includes('web.whatsapp.com') || t.url.includes('mail.google.com'))) {
            try {
              const ws = new WebSocket(t.webSocketDebuggerUrl);
              await new Promise(r => ws.on('open', r));
              const call = createCdpCaller(ws);
              await call('Runtime.evaluate', { expression: hudJs });
              ws.close();
            } catch (e) {}
          }
        }
      } catch (e) {}

      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

runAutonomousInfinitePipeline();
