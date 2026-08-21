/**
 * HYPERION B2B AUTOMATED LEAD CAMPAIGN DISPATCHER
 * 
 * Flow per Lead:
 * 1. Formats personalized high-ticket Neuro-Sales WhatsApp copy + HD flyer image.
 * 2. Injects Capa Manus v3.2 overlay & sends WhatsApp message -> Captures audit proof.
 * 3. Formats personalized rich HTML Pure DOM Gmail proposal + financial table + HD flyer.
 * 4. Injects Capa Manus v3.2 overlay & sends Gmail email -> Captures audit proof.
 * 5. Updates lead_campaign_tracker.json with timestamp and status.
 * 6. Waits 5-minute interval (300 seconds) before proceeding to the next lead.
 */

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ROBUST_MANUS_ENGINE } = require('./hyperion_robust_manus_overlay');

const CDP_PORT = 9001;
const LEADS_FILE = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\data\\master_leads_database.json';
const TRACKER_FILE = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\data\\lead_campaign_tracker.json';
const ASSETS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets';
const FLYER = path.join(ASSETS_DIR, 'nanoai_b2b_square_hd_flyer.jpg');

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutos exactos

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

function getLeads() {
  if (fs.existsSync(LEADS_FILE)) {
    return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  }
  return [];
}

function getTracker() {
  if (fs.existsSync(TRACKER_FILE)) {
    return JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
  }
  return { processedLeads: [], totalSent: 0, lastRun: null };
}

function saveTracker(data) {
  fs.writeFileSync(TRACKER_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// -------------------------------------------------------------
// WHATSAPP DISPATCHER
// -------------------------------------------------------------
async function sendWhatsAppLead(lead, leadIndex) {
  console.log(`\n[WHATSAPP] Procesando Lead #${leadIndex + 1}: ${lead.business_name} (${lead.niche})...`);

  const tabs = await getTabs();
  const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!waTab) throw new Error('WhatsApp tab no encontrada');

  const ws = new WebSocket(waTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const call = createCdpCaller(ws);
  await call('DOM.enable');

  // Seleccionar chat Tú
  await call('Runtime.evaluate', {
    expression: `(() => {
      const chatRows = Array.from(document.querySelectorAll('div[role="listitem"]'));
      const tu = chatRows.find(c => c.innerText && (c.innerText.includes('Tú') || c.innerText.includes('8229')));
      if (tu) tu.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const copy = `⚡ *NANOAI INDUSTRIAL OS* | _Propuesta B2B Exclusiva para ${lead.business_name}_

Estimada Gerencia de *${lead.business_name}* (${lead.city}):
¿Cuánto le cuesta al mes en su sector (*${lead.niche}*) mantener procesos manuales de cotización y despiece?

📊 *Impacto Operativo Comprobado:*
🔴 *Operación Tradicional:* -$3,600 USD/mes en nómina técnica fija | 48h de espera | 8% a 15% de descarte.
🟢 *NanoAI Air-Gapped:* $0 nómina recurrente | < 45 segundos por cotización | < 2% de merma.

💰 *Retorno Financiero Proyectado:* Recuperación de *+$4,200 USD/mes* en flujo de caja neto.

🎁 *OFERTA HORMOZI DE LANZAMIENTO (QUITO):*
✅ *3 MESES GRATIS DE SOPORTE TÉCNICO Y ACTUALIZACIONES*
✅ *Visita Técnica Presencial de 20 minutos* en sus instalaciones por nuestro Director Técnico, Erick.

📅 _¿Qué día de esta semana le resultaría más conveniente para la demostración técnica de 20 minutos?_
🌐 https://nanoai.ec • WhatsApp: +593 99 809 8229`;

  // 1. Enviar texto del mensaje
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

  // 2. Adjuntar Flyer HD
  if (fs.existsSync(FLYER)) {
    const doc = await call('DOM.getDocument', { depth: -1, pierce: true });
    const fileInputs = await call('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
    const nodeIds = fileInputs.nodeIds || [];
    if (nodeIds.length > 0) {
      const desc = await call('DOM.describeNode', { nodeId: nodeIds[nodeIds.length - 1] });
      if (desc.node?.backendNodeId) {
        await call('DOM.setFileInputFiles', { backendNodeId: desc.node.backendNodeId, files: [FLYER] });
        await new Promise(r => setTimeout(r, 3000));

        // Enviar medio
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

  // 3. Inyectar Capa Manus v3.2 y Capturar Prueba
  await call('Runtime.evaluate', { expression: ROBUST_MANUS_ENGINE });
  await new Promise(r => setTimeout(r, 1000));
  const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
  const capturePath = path.join(ASSETS_DIR, `live_wa_lead_${lead.id}_verified.jpg`);
  if (snap?.data) {
    fs.writeFileSync(capturePath, Buffer.from(snap.data, 'base64'));
    console.log(`✅ [WHATSAPP] Prueba guardada: ${capturePath}`);
  }

  ws.close();
  return capturePath;
}

// -------------------------------------------------------------
// GMAIL DISPATCHER
// -------------------------------------------------------------
async function sendGmailLead(lead, leadIndex) {
  console.log(`\n[GMAIL] Procesando Lead #${leadIndex + 1}: ${lead.business_name} (${lead.niche})...`);

  const tabs = await getTabs();
  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com/mail/u/'));
  if (!gmTab) throw new Error('Gmail tab no encontrada');

  const ws = new WebSocket(gmTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const call = createCdpCaller(ws);
  await call('DOM.enable');

  const subject = `⚡ NANOAI INDUSTRIAL OS — Propuesta de Optimización de Nómina y Mermas para ${lead.business_name} [${lead.city}]`;

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

  // Llenar Destinatario
  await call('Runtime.evaluate', {
    expression: `(() => {
      const toField = document.querySelector('input[aria-label="Destinatarios"]') || 
                      document.querySelector('input[peoplekit-id]') ||
                      document.querySelector('input[name="to"]') ||
                      document.querySelector('input.agP');
      if (toField) toField.focus();
    })()`
  });
  await call('Input.insertText', { text: 'erickl.rm@gmail.com' });
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
      h3.innerText = 'Propuesta de Eficiencia Operativa y Control de Costos para ' + ${JSON.stringify(lead.business_name)};
      card.appendChild(h3);

      const p1 = document.createElement('p');
      p1.style.cssText = 'font-size: 12.5px; color: #475569; margin: 0 0 14px 0;';
      p1.innerHTML = 'Estimada Dirección y Gerencia de <strong>' + ${JSON.stringify(lead.business_name)} + '</strong>:<br>En el sector de <strong>' + ${JSON.stringify(lead.niche)} + '</strong> en ' + ${JSON.stringify(lead.city)} + ', mantener cotizaciones manuales y cálculos de despiece tradicionales genera más de <strong style="color:#dc2626;">$3,600 USD/mes en nómina fija técnica</strong> y mermas de hasta el 15%.';
      card.appendChild(p1);

      const table = document.createElement('table');
      table.style.cssText = 'border-collapse: collapse; width: 100%; font-size: 12px; margin-bottom: 14px; border: 1px solid #cbd5e1;';
      const thead = document.createElement('tr');
      thead.style.cssText = 'background: #0f172a; color: #ffffff;';
      thead.innerHTML = '<th style="padding:7px;text-align:left;">Indicador Operativo</th><th style="padding:7px;text-align:center;">Método Manual</th><th style="padding:7px;text-align:right;">NanoAI On-Premise</th>';
      table.appendChild(thead);

      const rows = [
        ['Nómina Fija Técnica (3 Personas):', '-$3,600 USD / mes', '$0 nómina fija técnica', '#dc2626', '#16a34a'],
        ['Tiempo por Cotización:', '24 a 48 horas', '< 45 segundos en vivo', '#64748b', '#2563eb'],
        ['Desperdicio y Merma:', '8% a 15% del costo', '< 2% (Nesting algorítmico)', '#64748b', '#16a34a'],
        ['Flujo Neto Recuperado:', 'Pérdida continua', '+$4,200 USD / mes', '#dc2626', '#16a34a']
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
      offer.innerHTML = '<strong>🎁 OFERTA HORMOZI DE LANZAMIENTO (' + ${JSON.stringify(lead.city)} + '):</strong><br>Incluye <strong>3 MESES GRATIS DE SOPORTE TÉCNICO</strong> más una <strong>visita técnica presencial de 20 minutos</strong> en sus instalaciones por nuestro Director Técnico, Erick.';
      card.appendChild(offer);

      const ctaWrap = document.createElement('div');
      ctaWrap.style.cssText = 'text-align: center; margin-bottom: 12px;';
      ctaWrap.innerHTML = '<a href="https://wa.me/593998098229?text=Hola%20Erick,%20deseo%20coordinar%20la%20visita%20tecnica%20de%20NanoAI" style="background:#0f172a;color:#ffffff;padding:11px 26px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:12.5px;display:inline-block;border:2px solid #2563eb;">📅 Agendar Demostración Técnica de 20 Minutos</a>';
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
  const capturePath = path.join(ASSETS_DIR, `live_gm_lead_${lead.id}_verified.jpg`);
  if (snap?.data) {
    fs.writeFileSync(capturePath, Buffer.from(snap.data, 'base64'));
    console.log(`✅ [GMAIL] Prueba guardada: ${capturePath}`);
  }

  ws.close();
  return capturePath;
}

// -------------------------------------------------------------
// ORQUESTADOR PRINCIPAL CON INTERVALO DE 5 MINUTOS
// -------------------------------------------------------------
async function runCampaign(maxLeads = 3) {
  const leads = getLeads();
  const tracker = getTracker();

  console.log('================================================================');
  console.log(`🎯 INICIANDO CAMPAÑA DE PROSPECCIÓN B2B (${maxLeads} LEADS, INTERVALO: 5 MIN)`);
  console.log(`📊 Base de Prospectos Total: ${leads.length} | Procesados anteriormente: ${tracker.processedLeads.length}`);
  console.log('================================================================');

  let processedCount = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    if (tracker.processedLeads.includes(lead.id)) {
      continue;
    }

    if (processedCount >= maxLeads) {
      console.log(`\n🏁 Límite de ${maxLeads} leads para esta sesión completado.`);
      break;
    }

    console.log(`\n----------------------------------------------------------------`);
    console.log(`🚀 [${processedCount + 1}/${maxLeads}] DISPARANDO CAMPAÑA PARA: ${lead.business_name} (${lead.city})`);
    console.log(`----------------------------------------------------------------`);

    const waProof = await sendWhatsAppLead(lead, processedCount);
    const gmProof = await sendGmailLead(lead, processedCount);

    tracker.processedLeads.push(lead.id);
    tracker.totalSent += 2;
    tracker.lastRun = new Date().toISOString();
    saveTracker(tracker);

    processedCount++;

    if (processedCount < maxLeads) {
      console.log(`\n⏳ Esperando intervalo estricto de 5 minutos (300 segundos) para Lead #${processedCount + 1}...`);
      for (let s = 300; s > 0; s -= 30) {
        console.log(`⏱️ Próximo envío en: ${s} segundos...`);
        await new Promise(r => setTimeout(r, 30000));
      }
    }
  }

  console.log('\n================================================================');
  console.log(`🎉 JORNADA DE PROSPECCIÓN FINALIZADA: ${processedCount} Leads procesados.`);
  console.log('================================================================');
}

runCampaign(3);
