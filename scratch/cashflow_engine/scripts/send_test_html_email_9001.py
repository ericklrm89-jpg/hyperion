import asyncio
import websockets
import json
import base64
import os
import sys
import urllib.request

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ASSETS_DIR = r"C:\Users\erick\.gemini\antigravity-ide\scratch\cashflow_engine\public\assets"
FLYER = os.path.join(ASSETS_DIR, "nanoai_b2b_square_hd_flyer.jpg")
CDP_PORT = 9001
CDP_HTTP = f"http://127.0.0.1:{CDP_PORT}"

EMAIL_DATA = {
    "to": "erickl.rm@gmail.com",
    "subject": "⚡ NANOAI — Cómo eliminar $3,600/mes en nómina técnica y cotizar en 45 segundos [Propuesta Visual]",
    "body_html": """<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 620px; line-height: 1.6; border: 1px solid #cbd5e1; border-radius: 16px; padding: 26px; background: #ffffff; margin: 0 auto; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08);">
  
  <!-- Header Branding -->
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px;">
    <div>
      <span style="font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">⚡ NanoAI</span>
      <span style="background: #2563eb; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; margin-left: 8px; text-transform: uppercase;">Industrial OS</span>
    </div>
    <span style="background: #ecfdf5; color: #059669; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; border: 1px solid #a7f3d0; text-transform: uppercase;">
      🛡️ 100% On-Premise Air-Gapped
    </span>
  </div>

  <!-- Hook Directo al Dolor de Nómina y Mermas -->
  <h2 style="font-size: 17px; font-weight: 900; color: #0f172a; margin-top: 0; margin-bottom: 10px; line-height: 1.35;">
    ¿Cuánto le cuesta al mes depender de personal para cotizar, despiezar planos y calcular mermas?
  </h2>
  
  <p style="font-size: 14px; color: #475569; margin-bottom: 18px;">
    <strong>Estimada Gerencia de Operaciones y Dirección General:</strong><br>
    En plantas industriales en Quito, mantener 2 o 3 técnicos/digitadores para cotizar y calcular despiece representa más de <strong>$3,600 USD mensuales en nómina, IESS y horas extra</strong>... sumado al riesgo de que un cálculo manual tarde 48 horas o contenga errores de merma que le hagan perder dinero.
  </p>

  <!-- Side by Side Comparison Table -->
  <div style="background: #0f172a; border-radius: 12px; padding: 18px; color: #ffffff; margin-bottom: 22px; border: 1px solid #1e293b;">
    <div style="font-size: 11.5px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 800; margin-bottom: 12px; text-align: center;">
      📉 COMPARATIVA FINANCIERA: PERSONAL MANUAL VS. NANOAI INDUSTRIAL OS
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="border-bottom: 2px solid #334155;">
          <th style="text-align: left; padding: 7px 0; color: #94a3b8;">Concepto Operativo</th>
          <th style="text-align: center; padding: 7px 0; color: #f87171;">Personal Manual (3 Personas)</th>
          <th style="text-align: right; padding: 7px 0; color: #34d399;">Con NanoAI On-Premise</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 9px 0; color: #cbd5e1;">Nómina fija (Sueldos + IESS):</td>
          <td style="padding: 9px 0; text-align: center; color: #f87171; font-weight: 700;">-$3,600 USD / mes</td>
          <td style="padding: 9px 0; text-align: right; color: #34d399; font-weight: 800;">$0 nómina recurrente</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 9px 0; color: #cbd5e1;">Tiempo de Cotización:</td>
          <td style="padding: 9px 0; text-align: center; color: #fca5a5;">24 a 48 horas</td>
          <td style="padding: 9px 0; text-align: right; color: #60a5fa; font-weight: 800;">< 45 segundos en vivo</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 9px 0; color: #cbd5e1;">Merma y Fuga de Material:</td>
          <td style="padding: 9px 0; text-align: center; color: #fca5a5;">8% a 15% del costo</td>
          <td style="padding: 9px 0; text-align: right; color: #34d399; font-weight: 800;">< 2% (Nesting algorítmico)</td>
        </tr>
        <tr>
          <td style="padding: 11px 0 0 0; color: #f8fafc; font-weight: 800;">Recuperación Neta en Caja:</td>
          <td style="padding: 11px 0 0 0; text-align: center; color: #ef4444; font-weight: 900;">Pérdida continua</td>
          <td style="padding: 11px 0 0 0; text-align: right; color: #10b981; font-weight: 900; font-size: 15px;">+$4,200 USD / mes</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Qué hace NanoAI -->
  <div style="margin-bottom: 20px;">
    <div style="font-size: 13.5px; font-weight: 800; color: #0f172a; margin-bottom: 8px; text-transform: uppercase;">
      ⚡ Automatice Tareas Repetitivas y Blinde sus Fórmulas:
    </div>
    <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.65;">
      <li><strong>Cotizador Autónomo en 45 Segundos:</strong> Genera presupuestos formales en PDF con desglose exacto de materia prima y horas máquina.</li>
      <li><strong>Nesting y Despiece Algorítmico:</strong> Maximiza el aprovechamiento de materias primas reduciendo el descarte al mínimo.</li>
      <li><strong>Cero Nube / Seguridad Air-Gapped:</strong> Instalado físicamente en su fábrica. Sus costos y planos nunca tocan servidores externos.</li>
    </ul>
  </div>

  <!-- Hormozi $100M Offer -->
  <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 10px; padding: 16px; margin-bottom: 22px;">
    <div style="font-size: 13.5px; font-weight: 900; color: #1e40af; margin-bottom: 4px;">
      🎁 OFERTA IRRESISTIBLE DE LANZAMIENTO (QUITO)
    </div>
    <div style="font-size: 13px; color: #1e3a8a; line-height: 1.5;">
      Por la adquisición de la licencia On-Premise, incluimos <strong>3 MESES GRATIS DE SOPORTE TÉCNICO</strong> más una <strong>visita presencial de 20 minutos</strong> en su planta por nuestro Director Técnico, Erick.
    </div>
  </div>

  <!-- CTA Action Button -->
  <div style="text-align: center; margin-bottom: 20px;">
    <a href="https://wa.me/593998098229?text=Hola%20Erick,%20deseo%20coordinar%20la%20visita%20tecnica%20de%20NanoAI" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 8px; font-weight: 800; font-size: 13.5px; border: 2px solid #2563eb; box-shadow: 0 6px 14px rgba(15,23,42,0.25);">
      📅 Agendar Demostración Técnica de 20 Minutos
    </a>
  </div>

  <!-- Signoff -->
  <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 12px; color: #64748b; line-height: 1.5;">
    <strong>Erick R.</strong> &bull; Director Técnico — NanoAI Ecuador<br>
    Quito, Ecuador &bull; WhatsApp Directo: +593 99 809 8229<br>
    <a href="https://nanoai.ec" style="color: #2563eb; text-decoration: none; font-weight: 700;">https://nanoai.ec</a>
  </div>

</div>"""
}

CAPA_MANUS_SCRIPT = """
(function(){
  if(window.__HY_TID) clearInterval(window.__HY_TID);
  document.querySelectorAll('#__hyperion_overlay_root, .hy-el, .hy-badge-banner').forEach(function(e){ e.remove(); });
  if(!document.getElementById('__hyperion_overlay_styles')){
    var s = document.createElement('style');
    s.id = '__hyperion_overlay_styles';
    s.textContent = `
      #__hyperion_overlay_root { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; pointer-events: none !important; z-index: 2147483647 !important; overflow: hidden !important; }
      .hy-el { position: fixed !important; pointer-events: none !important; z-index: 2147483647 !important; box-sizing: border-box !important; border: 2px solid !important; border-radius: 4px !important; background: rgba(0, 0, 0, 0.04) !important; }
      .hy-badge { position: absolute !important; top: -14px !important; left: 0 !important; padding: 1px 5px !important; font: 900 10px/12px 'Courier New', monospace !important; border-radius: 3px !important; z-index: 2147483647 !important; box-shadow: 0 2px 4px rgba(0,0,0,0.6) !important; white-space: nowrap !important; }
      .hy-badge-banner { position: fixed !important; top: 8px !important; left: 50% !important; transform: translateX(-50%) !important; background: #0f172a !important; border: 2px solid #00ff66 !important; color: #00ff66 !important; padding: 5px 16px !important; font: 800 12px/15px 'Courier New', monospace !important; border-radius: 20px !important; z-index: 2147483647 !important; box-shadow: 0 4px 14px rgba(0,0,0,0.8) !important; pointer-events: none !important; }
    `;
    document.head.appendChild(s);
  }
  var PALETTE = [
    { border: '#00ff66', badge: '#00ff66', text: '#000' },
    { border: '#00e5ff', badge: '#00e5ff', text: '#000' },
    { border: '#ff007f', badge: '#ff007f', text: '#fff' },
    { border: '#ffea00', badge: '#ffea00', text: '#000' },
    { border: '#d500f9', badge: '#d500f9', text: '#fff' },
  ];
  function collect(){
    var elements = [], selectors = 'button, input, textarea, a[href], footer div[contenteditable="true"], [role="button"], [role="tab"], [role="menuitem"], [role="row"]';
    var all = document.querySelectorAll(selectors), count = 0;
    for(var i = 0; i < all.length; i++){
      try {
        var el = all[i];
        if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
        var b = el.getBoundingClientRect();
        if (b.width < 12 || b.height < 12 || b.width > window.innerWidth * 0.95 && b.height > window.innerHeight * 0.95) continue;
        count++;
        var label = (el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder') || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 14);
        elements.push({ sid: count, rect: { left: Math.round(b.left), top: Math.round(b.top), width: Math.round(b.width), height: Math.round(b.height) }, label: label });
      } catch(e){}
    }
    return elements;
  }
  function render(){
    try {
      var root = document.getElementById('__hyperion_overlay_root');
      if(!root){ root = document.createElement('div'); root.id = '__hyperion_overlay_root'; document.documentElement.appendChild(root); }
      root.innerHTML = '';
      var els = collect();
      var banner = document.createElement('div'); banner.className = 'hy-badge-banner'; banner.textContent = '⚡ CAPA MANUS MULTICOLOR [' + els.length + ' ELEMENTOS]'; root.appendChild(banner);
      for(var i = 0; i < els.length; i++){
        var e = els[i], b = e.rect, c = PALETTE[(e.sid - 1) % PALETTE.length];
        var d = document.createElement('div'); d.className = 'hy-el'; d.style.cssText = 'left:' + b.left + 'px;top:' + b.top + 'px;width:' + b.width + 'px;height:' + b.height + 'px;border-color:' + c.border + ';';
        var badge = document.createElement('div'); badge.className = 'hy-badge'; badge.style.cssText = 'background:' + c.badge + ';color:' + c.text + ';';
        badge.textContent = '[' + e.sid + ']' + (b.width > 60 && e.label ? ' ' + e.label : '');
        d.appendChild(badge); root.appendChild(d);
      }
    } catch(err){}
  }
  render();
  window.__HY_TID = setInterval(render, 250);
})()
"""

async def send_gmail():
    print(f"📡 Conectando a CDP en {CDP_HTTP}...")
    req = urllib.request.urlopen(f"{CDP_HTTP}/json")
    tabs = json.loads(req.read().decode('utf-8'))
    
    gm_tab = next((t for t in tabs if ('google.com' in t.get('url', '') or 'mail' in t.get('url', '')) and t.get('type') == 'page'), tabs[0])
    print(f"🎯 Tab seleccionado: [{gm_tab.get('id')}] {gm_tab.get('title')} -> {gm_tab.get('url')}")
    
    ws_url = gm_tab['webSocketDebuggerUrl']
    async with websockets.connect(ws_url, max_size=50*1024*1024) as ws:
        print("🌐 Navegando a https://mail.google.com/mail/u/0/#inbox...")
        await ws.send(json.dumps({'id': 1, 'method': 'Page.navigate', 'params': {'url': 'https://mail.google.com/mail/u/0/#inbox'}}))
        await ws.recv()
        await asyncio.sleep(5)

        # Inyectar Capa Manus
        print("🎨 Inyectando Capa Manus...")
        await ws.send(json.dumps({'id': 2, 'method': 'Runtime.evaluate', 'params': {'expression': CAPA_MANUS_SCRIPT, 'returnByValue': True}}))
        await ws.recv()
        await asyncio.sleep(1)

        # Click Redactar
        print("📝 Haciendo clic en Redactar...")
        js_redactar = """(() => {
            const btn = Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText && (b.innerText.includes('Redactar') || b.innerText.includes('Compose')));
            if (btn) { btn.click(); return 'REDACTAR_CLICKED'; }
            return 'NO_REDACTAR_BTN';
        })()"""
        await ws.send(json.dumps({'id': 3, 'method': 'Runtime.evaluate', 'params': {'expression': js_redactar, 'returnByValue': True}}))
        r = json.loads(await ws.recv())
        print("Estado Redactar:", r.get('result', {}).get('value'))
        await asyncio.sleep(3)

        # Llenar campos
        print("✍️ Inyectando HTML Enriquecido, Destinatario y Asunto...")
        js_fill = f"""(() => {{
            const toInput = document.querySelector('input[aria-label="Para"]') || document.querySelector('input[peoplekit-id]') || document.querySelector('input[aria-label="To recipients"]');
            if (toInput) {{ 
                toInput.focus(); 
                document.execCommand('insertText', false, '{EMAIL_DATA["to"]}'); 
            }}
            const subj = document.querySelector('input[name="subjectbox"]') || document.querySelector('input[aria-label="Asunto"]') || document.querySelector('input[aria-label="Subject"]');
            if (subj) {{ 
                subj.focus(); 
                document.execCommand('insertText', false, '{EMAIL_DATA["subject"]}'); 
            }}
            const body = document.querySelector('div[aria-label="Cuerpo del mensaje"]') || document.querySelector('div[aria-label="Message Body"]') || document.querySelector('div[role="textbox"]');
            if (body) {{
                body.focus();
                document.execCommand('selectAll', false, null);
                document.execCommand('delete', false, null);
                document.execCommand('insertHTML', false, `{EMAIL_DATA["body_html"]}`);
            }}
            return 'FIELDS_FILLED';
        }})()"""
        await ws.send(json.dumps({'id': 4, 'method': 'Runtime.evaluate', 'params': {'expression': js_fill, 'returnByValue': True}}))
        r = json.loads(await ws.recv())
        print("Estado llenado:", r.get('result', {}).get('value'))
        await asyncio.sleep(2)

        # Adjuntar Flyer HD
        if os.path.exists(FLYER):
            print(f"📎 Inyectando archivo adjunto HD: {FLYER}...")
            doc_res = json.loads(await (await ws.send(json.dumps({'id': 5, 'method': 'DOM.getDocument', 'params': {'depth': -1, 'pierce': True}})) or ws.recv()))
            root_id = doc_res.get('result', {}).get('root', {}).get('nodeId', 1)

            await ws.send(json.dumps({'id': 6, 'method': 'DOM.querySelector', 'params': {'nodeId': root_id, 'selector': 'input[type="file"]'}}))
            q_res = json.loads(await ws.recv())
            node_id = q_res.get('result', {}).get('nodeId')
            if node_id:
                await ws.send(json.dumps({'id': 7, 'method': 'DOM.describeNode', 'params': {'nodeId': node_id}}))
                desc = json.loads(await ws.recv())
                b_id = desc.get('result', {}).get('node', {}).get('backendNodeId')
                if b_id:
                    await ws.send(json.dumps({'id': 8, 'method': 'DOM.setFileInputFiles', 'params': {'backendNodeId': b_id, 'files': [FLYER]}}))
                    await ws.recv()
                    print("Adjunto inyectado correctamente.")
                    await asyncio.sleep(4)

        # Captura previa al envío (muestra el HTML renderizado en vivo)
        await ws.send(json.dumps({'id': 990, 'method': 'Page.captureScreenshot', 'params': {'format': 'jpeg', 'quality': 95}}))
        ss = json.loads(await ws.recv())
        data = ss.get('result', {}).get('data')
        if data:
            prev_out = os.path.join(ASSETS_DIR, "live_gm_before_send.jpg")
            with open(prev_out, 'wb') as f:
                f.write(base64.b64decode(data))
            print(f"📸 Captura previa guardada: {prev_out}")

        # Click Enviar
        print("🚀 Haciendo clic en Enviar...")
        js_send = """(() => {
            const sendBtn = Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText && (b.innerText === 'Enviar' || b.innerText === 'Send' || b.innerText.includes('Enviar')));
            if (sendBtn) { sendBtn.click(); return 'SEND_CLICKED'; }
            return 'SEND_NOT_FOUND';
        })()"""
        await ws.send(json.dumps({'id': 9, 'method': 'Runtime.evaluate', 'params': {'expression': js_send, 'returnByValue': True}}))
        r = json.loads(await ws.recv())
        print("Estado Envío:", r.get('result', {}).get('value'))
        await asyncio.sleep(4)

        # Navegar a #sent
        print("📬 Navegando a Enviados (#sent)...")
        await ws.send(json.dumps({'id': 10, 'method': 'Page.navigate', 'params': {'url': 'https://mail.google.com/mail/u/0/#sent'}}))
        await ws.recv()
        await asyncio.sleep(4)

        # Captura final de confirmación
        await ws.send(json.dumps({'id': 999, 'method': 'Page.captureScreenshot', 'params': {'format': 'jpeg', 'quality': 95}}))
        ss = json.loads(await ws.recv())
        data = ss.get('result', {}).get('data')
        if data:
            final_out = os.path.join(ASSETS_DIR, "live_gm_bonito_html_verified.jpg")
            with open(final_out, 'wb') as f:
                f.write(base64.b64decode(data))
            print(f"✅ CAPTURA FINAL AUDITADA GUARDADA: {final_out}")

if __name__ == '__main__':
    asyncio.run(send_gmail())
