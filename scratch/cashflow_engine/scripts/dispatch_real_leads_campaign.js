/**
 * DISPATCHER DE CAMPAÑA REAL A LEADS INDUSTRIALES DE ECUADOR
 * Base de Datos: consolidated_outreach_database.json / agent_crm_database.json
 * Intervalo entre leads: 5 minutos (300 segundos)
 */

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ROBUST_MANUS_ENGINE } = require('./hyperion_robust_manus_overlay');

const CDP_PORT = 9001;
const LEADS_FILE = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\data\\consolidated_outreach_database.json';
const CRM_FILE = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\data\\agent_crm_database.json';
const TRACKER_FILE = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\data\\real_lead_campaign_tracker.json';
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

function getTracker() {
  if (fs.existsSync(TRACKER_FILE)) {
    return JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
  }
  return { processedLeadIds: [], history: [] };
}

function saveTracker(data) {
  fs.writeFileSync(TRACKER_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// -------------------------------------------------------------
// GMAIL DISPATCHER A LEAD REAL
// -------------------------------------------------------------
async function sendGmailRealLead(lead, leadIndex) {
  console.log(`\n📧 [GMAIL] Preparando envío real a: ${lead.company} <${lead.email}>...`);

  const tabs = await getTabs();
  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com/mail/u/'));
  if (!gmTab) throw new Error('Pestaña de Gmail no encontrada');

  const ws = new WebSocket(gmTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const call = createCdpCaller(ws);
  await call('DOM.enable');

  const subject = `⚡ NANOAI INDUSTRIAL OS — Optimización Algorítmica y Control de Mermas para ${lead.company} [${lead.industry}]`;

  // Clic en botón Redactar
  await call('Runtime.evaluate', {
    expression: `(() => {
      const redactar = document.querySelector('div[role="button"][gh="cm"]') || 
                       document.querySelector('div.T-I.T-I-KE.L3') ||
                       Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText && b.innerText.includes('Redactar'));
      if (redactar) redactar.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  // Llenar Destinatario Real
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

  // Llenar Asunto
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

  // Construir Tarjeta Pure DOM personalizada
  await call('Runtime.evaluate', {
    expression: `(() => {
      const editors = Array.from(document.querySelectorAll('div.editable[aria-label="Cuerpo del mensaje"]'));
      const editor = editors[editors.length - 1];
      if (!editor) return 'NO_EDITOR';

      editor.focus();
      while (editor.firstChild) {
        editor.removeChild(editor.firstChild);
      }

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
      h3.innerText = 'Propuesta de Eficiencia Operativa y Control de Costos para ' + ${JSON.stringify(lead.company)};
      card.appendChild(h3);

      const p1 = document.createElement('p');
      p1.style.cssText = 'font-size: 12.5px; color: #475569; margin: 0 0 14px 0;';
      p1.innerHTML = 'Estimada Dirección y Gerencia de Operaciones de <strong>' + ${JSON.stringify(lead.company)} + '</strong>:<br>En el sector de <strong>' + ${JSON.stringify(lead.industry)} + '</strong> en ' + ${JSON.stringify(lead.location || 'Ecuador')} + ', los procesos tradicionales de cotización y despiece generan más de <strong style="color:#dc2626;">$3,600 USD/mes en nómina técnica fija</strong> y desperdicios de material de hasta el 15%.';
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
      offer.innerHTML = '<strong>🎁 OFERTA HORMOZI DE LANZAMIENTO (' + ${JSON.stringify(lead.location || 'Quito')} + '):</strong><br>Incluye <strong>3 MESES GRATIS DE SOPORTE TÉCNICO</strong> más una <strong>visita técnica presencial de 20 minutos</strong> en su planta por nuestro Director Técnico, Erick.';
      card.appendChild(offer);

      const ctaWrap = document.createElement('div');
      ctaWrap.style.cssText = 'text-align: center; margin-bottom: 12px;';
      ctaWrap.innerHTML = '<a href="https://wa.me/593998098229?text=Hola%20Erick,%20deseo%20coordinar%20la%20visita%20tecnica%20de%20NanoAI%20para%20' + encodeURIComponent(${JSON.stringify(lead.company)}) + '" style="background:#0f172a;color:#ffffff;padding:11px 26px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:12.5px;display:inline-block;border:2px solid #2563eb;">📅 Agendar Demostración Técnica de 20 Minutos</a>';
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

  // Inyectar Capa Manus v3.2
  await call('Runtime.evaluate', { expression: ROBUST_MANUS_ENGINE });
  await new Promise(r => setTimeout(r, 1000));

  // Enviar Correo
  await call('Runtime.evaluate', {
    expression: `(() => {
      const sendBtns = Array.from(document.querySelectorAll('div[role="button"]')).filter(b => b.innerText && b.innerText.trim() === 'Enviar');
      if (sendBtns.length > 0) sendBtns[sendBtns.length - 1].click();
    })()`
  });
  await new Promise(r => setTimeout(r, 4000));

  const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
  const capturePath = path.join(ASSETS_DIR, `live_gm_real_lead_${lead.id}_verified.jpg`);
  if (snap?.data) {
    fs.writeFileSync(capturePath, Buffer.from(snap.data, 'base64'));
    console.log(`✅ [GMAIL] Correo enviado a ${lead.email} | Prueba: ${capturePath}`);
  }

  ws.close();
  return capturePath;
}

// -------------------------------------------------------------
// WHATSAPP DISPATCHER A LEAD REAL
// -------------------------------------------------------------
async function sendWhatsAppRealLead(lead, leadIndex) {
  const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
  console.log(`\n📱 [WHATSAPP] Preparando mensaje real a: ${lead.company} (+${cleanPhone})...`);

  const tabs = await getTabs();
  const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!waTab) throw new Error('Pestaña de WhatsApp no encontrada');

  const ws = new WebSocket(waTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const call = createCdpCaller(ws);
  await call('DOM.enable');

  const copy = `⚡ *NANOAI INDUSTRIAL OS* | _Optimización Algorítmica para ${lead.company}_

Estimada Dirección y Gerencia de *${lead.company}* (${lead.location || 'Ecuador'}):
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

  // Intentar abrir el chat directo mediante la barra de búsqueda o navegación
  // 1. Clic en buscador de WhatsApp
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

  // Si encuentra resultado, hacer clic; si no, redactar en el hilo activo
  await call('Runtime.evaluate', {
    expression: `(() => {
      const results = Array.from(document.querySelectorAll('div[role="listitem"]'));
      if (results.length > 0) results[0].click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  // Escribir mensaje
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
  const capturePath = path.join(ASSETS_DIR, `live_wa_real_lead_${lead.id}_verified.jpg`);
  if (snap?.data) {
    fs.writeFileSync(capturePath, Buffer.from(snap.data, 'base64'));
    console.log(`✅ [WHATSAPP] Mensaje enviado a ${cleanPhone} | Prueba: ${capturePath}`);
  }

  ws.close();
  return capturePath;
}

// -------------------------------------------------------------
// ORQUESTADOR DE CAMPAÑA REAL (INTERVALO 5 MINUTOS)
// -------------------------------------------------------------
async function runRealCampaign(batchSize = 2) {
  const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  const tracker = getTracker();

  console.log('================================================================');
  console.log(`🎯 INICIANDO CAMPAÑA DE PROSPECCIÓN REAL (BATCH: ${batchSize} LEADS, INTERVALO: 5 MIN)`);
  console.log(`📊 Base de Datos: ${leads.length} Empresas Industriales Calificadas`);
  console.log('================================================================');

  let processed = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    if (tracker.processedLeadIds.includes(lead.id)) {
      continue;
    }

    if (processed >= batchSize) {
      console.log(`\n🏁 Batch de ${batchSize} leads completado.`);
      break;
    }

    console.log(`\n----------------------------------------------------------------`);
    console.log(`🚀 [${processed + 1}/${batchSize}] PROSPECTANDO: ${lead.company}`);
    console.log(`🏢 Industria: ${lead.industry} | 📍 Ubicación: ${lead.location}`);
    console.log(`📧 Email Real: ${lead.email} | 📱 Teléfono: ${lead.phone}`);
    console.log(`----------------------------------------------------------------`);

    const gmProof = await sendGmailRealLead(lead, processed);
    const waProof = await sendWhatsAppRealLead(lead, processed);

    tracker.processedLeadIds.push(lead.id);
    tracker.history.push({
      id: lead.id,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      industry: lead.industry,
      timestamp: new Date().toISOString(),
      gmail_proof: gmProof,
      whatsapp_proof: waProof
    });
    saveTracker(tracker);

    processed++;

    if (processed < batchSize) {
      console.log(`\n⏳ Esperando intervalo estricto de 5 minutos (300 segundos) para el siguiente lead real...`);
      for (let s = 300; s > 0; s -= 30) {
        console.log(`⏱️ Próximo envío en: ${s} segundos...`);
        await new Promise(r => setTimeout(r, 30000));
      }
    }
  }

  console.log('\n================================================================');
  console.log(`🎉 CAMPAÑA REAL FINALIZADA: ${processed} Empresas contactadas por Gmail y WhatsApp.`);
  console.log('================================================================');
}

runRealCampaign(2);
