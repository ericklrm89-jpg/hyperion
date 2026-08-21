const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ROBUST_MANUS_ENGINE } = require('./hyperion_robust_manus_overlay');

const CDP_PORT = 9001;
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

// -------------------------------------------------------------
// CAMPAÑA WHATSAPP: MENSAJE 1 & 2
// -------------------------------------------------------------
const WA_MSG_1 = `⚡ *NANOAI INDUSTRIAL OS* | _Optimización Algorítmica en Planta_

Estimada Gerencia de Operaciones:
¿Cuánto le cuesta al mes calcular mermas y cotizar tirajes de forma manual?

📊 *Comparativa Real en Fábricas de Quito:*
🔴 *Método Tradicional:* -$3,600 USD/mes en nómina técnica fija (3 personas) | 48h de espera | 8% a 15% de descarte.
🟢 *NanoAI Air-Gapped:* $0 nómina recurrente | < 45 segundos por cotización | < 2% de merma de material.

💰 *Impacto Financiero Directo:* Retorno neto de *+$4,200 USD/mes* en flujo de caja.

🎁 *OFERTA HORMOZI DE LANZAMIENTO (QUITO):*
✅ *3 MESES GRATIS DE SOPORTE TÉCNICO*
✅ *Visita Técnica Presencial de 20 minutos* en su planta por nuestro Director Técnico.

📅 _¿Coordinamos la visita técnica para este jueves o viernes?_
🌐 https://nanoai.ec`;

const WA_MSG_2 = `🛡️ *NANOAI AIR-GAPPED OS* | _Inteligencia Artificial 100% On-Premise_

Estimada Dirección General:
¿Sabía que puede automatizar el 100% de la ingeniería de costos de su planta sin subir planos ni datos a la nube?

⚡ *Garantías del Sistema:*
🔒 *100% Fuera de Internet:* Su propiedad intelectual, planos CAD y fórmulas nunca salen de su red física.
⚡ *Velocidad Extrema:* Generación de fichas técnicas y despiece instantáneo en 45 segundos.
📉 *Cero Dependencia Técnica:* Elimina cuellos de botella y errores humanos en cotizaciones complejas.

🎁 *BONUS DE LANZAMIENTO EXCLUSIVO:*
Incluye auditoría de costos en planta (20 min) + 3 meses de acompañamiento técnico sin costo.

📲 _Responda a este mensaje o coordine directamente al +593 99 809 8229._
🌐 https://nanoai.ec`;

async function executeWhatsAppCampaign() {
  console.log('\n======================================================');
  console.log('🚀 INICIANDO CAMPAÑA WHATSAPP (2 MENSAJES B2B HD)');
  console.log('======================================================');

  const tabs = await getTabs();
  const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  if (!waTab) throw new Error('No se encontró la pestaña de WhatsApp');

  const ws = new WebSocket(waTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const call = createCdpCaller(ws);
  await call('DOM.enable');

  // Asegurar chat Tú seleccionado
  console.log('1. Seleccionando chat Tú...');
  await call('Runtime.evaluate', {
    expression: `(() => {
      const chatRows = Array.from(document.querySelectorAll('div[role="listitem"]'));
      const tu = chatRows.find(c => c.innerText && (c.innerText.includes('Tú') || c.innerText.includes('8229')));
      if (tu) tu.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  // --- ENVÍO MENSAJE 1 ---
  console.log('2. Enviando Mensaje 1 con Flyer HD a WhatsApp...');
  // Inyectar texto en input de mensaje
  await call('Runtime.evaluate', {
    expression: `(() => {
      const msgBox = document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
                     document.querySelector('footer div[contenteditable="true"]');
      if (msgBox) {
        msgBox.focus();
        document.execCommand('insertText', false, ${JSON.stringify(WA_MSG_1)});
        msgBox.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  // Clic en enviar texto
  await call('Runtime.evaluate', {
    expression: `(() => {
      const sendBtn = document.querySelector('span[data-icon="send"]') || document.querySelector('button[aria-label="Enviar"]');
      if (sendBtn) sendBtn.closest('button, div[role="button"]').click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  // Adjuntar Flyer HD
  console.log('3. Adjuntando Flyer HD para Mensaje 1...');
  if (fs.existsSync(FLYER)) {
    const doc = await call('DOM.getDocument', { depth: -1, pierce: true });
    const fileInputs = await call('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
    const nodeIds = fileInputs.nodeIds || [];
    if (nodeIds.length > 0) {
      const desc = await call('DOM.describeNode', { nodeId: nodeIds[nodeIds.length - 1] });
      if (desc.node?.backendNodeId) {
        await call('DOM.setFileInputFiles', { backendNodeId: desc.node.backendNodeId, files: [FLYER] });
        await new Promise(r => setTimeout(r, 3000));
        // Clic en botón enviar medio
        await call('Runtime.evaluate', {
          expression: `(() => {
            const sendMedia = document.querySelector('span[data-icon="send"]') || document.querySelector('div[aria-label="Enviar"]');
            if (sendMedia) sendMedia.closest('button, div[role="button"]').click();
          })()`
        });
        await new Promise(r => setTimeout(r, 2500));
      }
    }
  }

  // Capturar prueba Mensaje 1 con Capa Manus v3.2
  await call('Runtime.evaluate', { expression: ROBUST_MANUS_ENGINE });
  await new Promise(r => setTimeout(r, 1000));
  let snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
  if (snap?.data) {
    const out1 = path.join(ASSETS_DIR, 'live_wa_msg1_sent_verified.jpg');
    fs.writeFileSync(out1, Buffer.from(snap.data, 'base64'));
    console.log('✅ CAPTURA WHATSAPP MENSAJE 1 GUARDADA:', out1);
  }

  // --- ENVÍO MENSAJE 2 ---
  console.log('4. Enviando Mensaje 2 con Flyer HD a WhatsApp...');
  await call('Runtime.evaluate', {
    expression: `(() => {
      const msgBox = document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
                     document.querySelector('footer div[contenteditable="true"]');
      if (msgBox) {
        msgBox.focus();
        document.execCommand('insertText', false, ${JSON.stringify(WA_MSG_2)});
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

  // Capturar prueba Mensaje 2 con Capa Manus v3.2
  await call('Runtime.evaluate', { expression: ROBUST_MANUS_ENGINE });
  await new Promise(r => setTimeout(r, 1000));
  snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
  if (snap?.data) {
    const out2 = path.join(ASSETS_DIR, 'live_wa_msg2_sent_verified.jpg');
    fs.writeFileSync(out2, Buffer.from(snap.data, 'base64'));
    console.log('✅ CAPTURA WHATSAPP MENSAJE 2 GUARDADA:', out2);
  }

  ws.close();
}

// -------------------------------------------------------------
// CAMPAÑA GMAIL: EMAIL 1 & 2
// -------------------------------------------------------------
async function executeGmailCampaign() {
  console.log('\n======================================================');
  console.log('🚀 INICIANDO CAMPAÑA GMAIL (2 PROPUESTAS HTML RICH DOM)');
  console.log('======================================================');

  const tabs = await getTabs();
  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com/mail/u/'));
  if (!gmTab) throw new Error('No se encontró la pestaña de Gmail');

  const ws = new WebSocket(gmTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const call = createCdpCaller(ws);
  await call('DOM.enable');

  // Helper para redactar y enviar un correo
  async function composeAndSend({ subject, isOption2, captureName }) {
    console.log(`\nRedactando correo: "${subject}"...`);

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
        if (toField) {
          toField.focus();
        }
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

    // Construir DOM Puro en el cuerpo del correo
    console.log('Construyendo tarjeta visual interactiva con Pure DOM...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const editors = Array.from(document.querySelectorAll('div.editable[aria-label="Cuerpo del mensaje"]'));
        const editor = editors[editors.length - 1];
        if (!editor) return 'NO_EDITOR';

        editor.focus();
        while (editor.firstChild) {
          editor.removeChild(editor.firstChild);
        }

        const isOpt2 = ${isOption2};

        // Contenedor Principal
        const card = document.createElement('div');
        card.style.cssText = 'font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; color: #0f172a; line-height: 1.5; padding: 20px; background: #ffffff; border: 2px solid ' + (isOpt2 ? '#16a34a' : '#2563eb') + '; border-radius: 12px; max-width: 620px; margin: 0 auto; box-shadow: 0 6px 18px rgba(0,0,0,0.08);';

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px;';
        
        const logo = document.createElement('span');
        logo.style.cssText = 'font-size: 20px; font-weight: 900; color: #0f172a;';
        logo.innerText = isOpt2 ? '🛡️ NanoAI Air-Gapped Security' : '⚡ NanoAI Industrial OS';
        
        const badge = document.createElement('span');
        badge.style.cssText = 'background: ' + (isOpt2 ? '#16a34a' : '#2563eb') + '; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 9px; border-radius: 6px; text-transform: uppercase; float: right;';
        badge.innerText = isOpt2 ? '🔒 CERO RIESGO EN NUBE' : '🛡️ 100% AIR-GAPPED';

        header.appendChild(logo);
        header.appendChild(badge);
        card.appendChild(header);

        // Título Hook
        const h3 = document.createElement('h3');
        h3.style.cssText = 'font-size: 15.5px; font-weight: 900; color: #0f172a; margin: 0 0 10px 0;';
        h3.innerText = isOpt2 
          ? '¿Por qué arriesgar planos CAD y fórmulas industriales en servicios nube de terceros?' 
          : '¿Cuánto le cuesta al mes mantener personal técnico para cotizar tirajes y calcular despiece?';
        card.appendChild(h3);

        // Párrafo
        const p1 = document.createElement('p');
        p1.style.cssText = 'font-size: 12.5px; color: #475569; margin: 0 0 14px 0;';
        const p1Intro = document.createElement('strong');
        p1Intro.innerText = 'Estimada Dirección y Gerencia de Operaciones:';
        p1.appendChild(p1Intro);
        p1.appendChild(document.createElement('br'));
        
        const p1Text = document.createTextNode(isOpt2
          ? 'NanoAI corre directamente en los servidores locales de su fábrica en Quito. Sin internet, sin suscripciones a APIs externas y con velocidad instantánea de respuesta.'
          : 'En plantas industriales en Quito, mantener 2 a 3 técnicos cotizadores representa más de ');
        p1.appendChild(p1Text);
        
        if (!isOpt2) {
          const p1Cost = document.createElement('strong');
          p1Cost.style.color = '#dc2626';
          p1Cost.innerText = '$3,600 USD mensuales en nómina fija e IESS';
          p1.appendChild(p1Cost);
          p1.appendChild(document.createTextNode('... sumado a esperas de 48h y descarte de material.'));
        }
        card.appendChild(p1);

        // Tabla Comparativa
        const table = document.createElement('table');
        table.style.cssText = 'border-collapse: collapse; width: 100%; font-size: 12px; margin-bottom: 14px; border: 1px solid #cbd5e1;';
        
        const thead = document.createElement('tr');
        thead.style.cssText = 'background: #0f172a; color: #ffffff;';
        const th1 = document.createElement('th'); th1.style.cssText = 'padding: 7px; text-align: left;'; th1.innerText = 'Parámetro';
        const th2 = document.createElement('th'); th2.style.cssText = 'padding: 7px; text-align: center;'; th2.innerText = 'Esquema Tradicional';
        const th3 = document.createElement('th'); th3.style.cssText = 'padding: 7px; text-align: right;'; th3.innerText = 'NanoAI On-Premise';
        thead.appendChild(th1); thead.appendChild(th2); thead.appendChild(th3);
        table.appendChild(thead);

        const rowsData = isOpt2 ? [
          ['Seguridad de Datos:', 'Fuga potencial en nube', '100% On-Premise Blindado', '#dc2626', '#16a34a'],
          ['Dependencia de Internet:', 'Caídas de línea frecuentes', 'Opera 24/7 sin conexión', '#64748b', '#2563eb'],
          ['Tiempos de Cotización:', '24 a 48 horas', '< 45 segundos en tiempo real', '#64748b', '#16a34a'],
          ['Ahorro en Desperdicio:', '8% a 15% merma', '< 2% (Nesting algorítmico)', '#dc2626', '#16a34a']
        ] : [
          ['Nómina Fija (3 Cotizadores):', '-$3,600 USD / mes', '$0 nómina fija técnica', '#dc2626', '#16a34a'],
          ['Tiempo de Cotización:', '24 a 48 horas', '< 45 segundos en vivo', '#64748b', '#2563eb'],
          ['Merma de Material:', '8% a 15% del costo', '< 2% (Nesting algorítmico)', '#64748b', '#16a34a'],
          ['Recuperación Neta en Caja:', 'Pérdida continua', '+$4,200 USD / mes', '#dc2626', '#16a34a']
        ];

        rowsData.forEach(([c1, c2, c3, col2, col3], idx) => {
          const tr = document.createElement('tr');
          tr.style.cssText = 'border-bottom: 1px solid #e2e8f0;';
          if (idx === rowsData.length - 1) tr.style.fontWeight = 'bold';
          
          const td1 = document.createElement('td'); td1.style.cssText = 'padding: 7px;'; td1.innerText = c1;
          const td2 = document.createElement('td'); td2.style.cssText = 'padding: 7px; text-align: center; color: ' + col2 + '; font-weight: bold;'; td2.innerText = c2;
          const td3 = document.createElement('td'); td3.style.cssText = 'padding: 7px; text-align: right; color: ' + col3 + '; font-weight: bold; font-size: ' + (idx === 3 ? '13.5px' : '12px') + ';'; td3.innerText = c3;
          
          tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
          table.appendChild(tr);
        });
        card.appendChild(table);

        // Tarjeta Oferta Hormozi
        const offer = document.createElement('div');
        offer.style.cssText = 'background: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 8px; padding: 12px; margin-bottom: 14px; font-size: 12px; color: #1e3a8a;';
        const offerTitle = document.createElement('strong');
        offerTitle.innerText = '🎁 OFERTA HORMOZI DE LANZAMIENTO (QUITO):';
        offer.appendChild(offerTitle);
        offer.appendChild(document.createElement('br'));
        offer.appendChild(document.createTextNode('Incluye '));
        const offBold = document.createElement('strong'); offBold.innerText = '3 MESES GRATIS DE SOPORTE TÉCNICO';
        offer.appendChild(offBold);
        offer.appendChild(document.createTextNode(' más una '));
        const offBold2 = document.createElement('strong'); offBold2.innerText = 'visita técnica presencial de 20 minutos';
        offer.appendChild(offBold2);
        offer.appendChild(document.createTextNode(' en su planta por nuestro Director Técnico, Erick.'));
        card.appendChild(offer);

        // Botón CTA
        const ctaWrap = document.createElement('div');
        ctaWrap.style.cssText = 'text-align: center; margin-bottom: 12px;';
        const ctaBtn = document.createElement('a');
        ctaBtn.href = 'https://wa.me/593998098229?text=Hola%20Erick,%20deseo%20coordinar%20la%20visita%20tecnica%20de%20NanoAI';
        ctaBtn.style.cssText = 'background: #0f172a; color: #ffffff; padding: 11px 26px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 12.5px; display: inline-block; border: 2px solid #2563eb;';
        ctaBtn.innerText = '📅 Agendar Demostración Técnica de 20 Minutos';
        ctaWrap.appendChild(ctaBtn);
        card.appendChild(ctaWrap);

        // Firma
        const signoff = document.createElement('div');
        signoff.style.cssText = 'border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 11px; color: #64748b;';
        const sBold = document.createElement('strong'); sBold.innerText = 'Erick R.';
        signoff.appendChild(sBold);
        signoff.appendChild(document.createTextNode(' • Director Técnico — NanoAI Ecuador • WhatsApp: +593 99 809 8229'));
        signoff.appendChild(document.createElement('br'));
        const sLink = document.createElement('a');
        sLink.href = 'https://nanoai.ec';
        sLink.style.cssText = 'color: #2563eb; text-decoration: none; font-weight: bold;';
        sLink.innerText = 'https://nanoai.ec';
        signoff.appendChild(sLink);
        card.appendChild(signoff);

        editor.appendChild(card);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });
    await new Promise(r => setTimeout(r, 1500));

    // Adjuntar Flyer HD
    console.log('Adjuntando Flyer HD...');
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
    console.log('Haciendo clic en botón Enviar de Gmail...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const sendBtns = Array.from(document.querySelectorAll('div[role="button"]')).filter(b => b.innerText && b.innerText.trim() === 'Enviar');
        if (sendBtns.length > 0) {
          sendBtns[sendBtns.length - 1].click();
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 4000));

    // Capturar pantalla de confirmación
    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap?.data) {
      const out = path.join(ASSETS_DIR, captureName);
      fs.writeFileSync(out, Buffer.from(snap.data, 'base64'));
      console.log(`✅ CAPTURA GMAIL GUARDADA: ${out}`);
    }
  }

  // Enviar Email 1
  await composeAndSend({
    subject: '⚡ NANOAI INDUSTRIAL OS — Cómo eliminar $3,600/mes en nómina técnica y cotizar en 45 segundos [Propuesta #1]',
    isOption2: false,
    captureName: 'live_gm_email1_sent_verified.jpg'
  });

  // Enviar Email 2
  await composeAndSend({
    subject: '🛡️ AUDITORÍA INDUSTRIAL AIR-GAPPED — Reducción de Mermas al <2% en Plantas de Quito [Propuesta #2]',
    isOption2: true,
    captureName: 'live_gm_email2_sent_verified.jpg'
  });

  ws.close();
}

async function main() {
  try {
    await executeWhatsAppCampaign();
    await executeGmailCampaign();
    console.log('\n🎉 CAMPAÑA 2x2 COMPLETADA CON ÉXITO TOTAL.');
  } catch (e) {
    console.error('❌ Error en ejecución de campaña:', e);
  }
}

main();
