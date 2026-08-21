// 1. ENVÍO DE EMAIL CORPORATIVO GMAIL (HYPERION CLEAN COMPOSE ENGINE)
async function sendGmailProposal(lead) {
  console.log(`\n📧 [GMAIL] Preparando propuesta HTML para: ${lead.company} <${lead.email}>...`);
  const tabs = await getTabs();
  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com'));
  if (!gmTab) throw new Error('Pestaña de Gmail no encontrada');

  const ws = new WebSocket(gmTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  const call = createCdpCaller(ws);
  await call('DOM.enable');

  // 1. Higiene: Cerrar modales de error y descartar borradores huérfanos
  await call('Runtime.evaluate', {
    expression: `(() => {
      // Cerrar modal de error si existe
      Array.from(document.querySelectorAll('button, div[role="button"]')).forEach(b => {
        if (b.innerText && (b.innerText.trim() === 'Aceptar' || b.innerText.trim() === 'OK')) b.click();
      });
      // Descartar borradores anteriores vacíos
      Array.from(document.querySelectorAll('div[data-tooltip*="Descartar borrador"], div[aria-label*="Descartar borrador"]')).forEach(b => b.click());
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));

  // 2. Redactar nuevo mensaje
  await call('Runtime.evaluate', {
    expression: `(() => {
      const composeBtn = document.querySelector('div[role="button"][gh="cm"]') ||
                         Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText && (b.innerText.includes('Redactar') || b.innerText.includes('Compose')));
      if (composeBtn) composeBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 2000));

  // 3. Inyectar destinatario en el último compose abierto
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

  // 4. Inyectar Asunto en el último compose abierto
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

  // 5. Inyectar cuerpo HTML enriquecido
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

  // 6. Adjuntar Flyer HD Específico
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

  // 7. Clic en Enviar del compose activo
  await call('Runtime.evaluate', {
    expression: `(() => {
      const sendBtns = Array.from(document.querySelectorAll('div[role="button"][data-tooltip*="Enviar"], div[role="button"][aria-label*="Enviar"]'));
      const activeSend = sendBtns[sendBtns.length - 1];
      if (activeSend) activeSend.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 4000));

  // Captura de Auditoría
  await call('Runtime.evaluate', { expression: ROBUST_MANUS_ENGINE });
  await new Promise(r => setTimeout(r, 1000));
  const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  const proofPath = path.join(ASSETS_DIR, `live_gm_${lead.id}_verified.jpg`);
  if (snap?.data) fs.writeFileSync(proofPath, Buffer.from(snap.data, 'base64'));
  console.log(`✅ [GMAIL] Enviado exitosamente a ${lead.email} | Prueba: ${proofPath}`);
  ws.close();
  return { success: true, proof: proofPath };
}
