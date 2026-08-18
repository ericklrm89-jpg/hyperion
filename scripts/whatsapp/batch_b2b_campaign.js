const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const LEADS_FILE = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\data\\master_leads_database.json';
const LOG_FILE = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\data\\campaign_history.json';

async function getGmailTab() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => {
        const tabs = JSON.parse(data);
        const gmailTab = tabs.find(t => t.url && t.url.includes('mail.google.com') && t.type === 'page');
        if (!gmailTab) reject(new Error('Pestaña de Gmail no encontrada'));
        else resolve(gmailTab);
      });
    }).on('error', reject);
  });
}

let _id = 1;
function cdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = _id++;
    const h = (data) => {
      const r = JSON.parse(data.toString());
      if (r.id === id) { ws.off('message', h); r.error ? reject(new Error(r.error.message)) : resolve(r.result); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runCampaignBatch(maxLeads = 5) {
  if (!fs.existsSync(LEADS_FILE)) {
    console.log('[ERROR] Archivo de leads no encontrado');
    return;
  }
  
  const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'));
  console.log(`[HYPERION B2B] Total de prospectos disponibles: ${leads.length}`);
  
  const tab = await getGmailTab();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r, e) => { ws.on('open', r); ws.on('error', e); });
  
  const campaignHistory = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8')) : [];
  const processedIds = new Set(campaignHistory.map(c => c.id));
  
  let count = 0;
  for (const lead of leads) {
    if (processedIds.has(lead.id)) continue;
    if (count >= maxLeads) break;
    
    console.log(`\n──────────────────────────────────────────────────────────`);
    console.log(`🚀 Preparando propuesta ${count + 1}/${maxLeads}: ${lead.business_name} (${lead.city})`);
    console.log(`   Email: ${lead.phone || lead.website}`);
    console.log(`   Ticket Estimado: $${lead.estimated_deal_value} USD`);
    
    // Clic en redactar
    await cdp(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('div[role="button"][gh="cm"]') || Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText && b.innerText.includes('Redactar'));
        if (btn) btn.click();
      })()`
    });
    
    await sleep(2000);
    
    const subject = `Propuesta Comercial Exclusiva: ${lead.opportunity} — ${lead.business_name}`;
    const emailTo = `contacto@${lead.niche.split(' ')[0].toLowerCase()}${lead.city.toLowerCase()}.com`;
    const body = `Estimado equipo directivo de ${lead.business_name},

Revisando el posicionamiento de negocios en ${lead.city}, identificamos una oportunidad inmediata para captar clientes que actualmente se van a la competencia.

Hemos estructurado un plan de ${lead.opportunity} enfocado en retorno de inversión directo.

El valor total de implementación es de $${lead.estimated_deal_value} USD, con entrega en 48 horas y garantía de satisfacción.

¿Podemos coordinar una llamada de 5 minutos o compartirles la maqueta interactiva?

Atentamente,
Erick — Equipo de Automatizaciones & Desarrollo Digital`;

    await cdp(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const subjField = document.querySelector('input[name="subjectbox"]');
        if (subjField) {
          subjField.value = ${JSON.stringify(subject)};
          subjField.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const bodyBox = document.querySelector('div[role="textbox"][aria-label*="Mensaje"]') || document.querySelector('.Am.Al.editable');
        if (bodyBox) {
          bodyBox.innerText = ${JSON.stringify(body)};
          bodyBox.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`
    });
    
    campaignHistory.push({
      id: lead.id,
      business_name: lead.business_name,
      city: lead.city,
      niche: lead.niche,
      deal_value: lead.estimated_deal_value,
      timestamp: new Date().toISOString(),
      status: 'DRAFTED_AND_READY'
    });
    
    fs.writeFileSync(LOG_FILE, JSON.stringify(campaignHistory, indent=2), 'utf-8');
    count++;
    await sleep(2000);
  }
  
  console.log(`\n🎉 Lote de ${count} propuestas estructuradas y precargadas exitosamente.`);
  ws.close();
}

runCampaignBatch(3).catch(console.error);
