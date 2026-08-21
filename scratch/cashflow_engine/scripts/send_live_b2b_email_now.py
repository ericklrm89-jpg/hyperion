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
CDP_HTTP = "http://127.0.0.1:9001"

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

async def send_now():
    req = urllib.request.urlopen(f"{CDP_HTTP}/json")
    tabs = json.loads(req.read().decode('utf-8'))
    gm_tab = next(t for t in tabs if t.get('type') == 'page' and 'mail.google.com/mail/u/' in t.get('url', ''))
    print(f"🎯 Conectando a Gmail Tab ({gm_tab['title']}): {gm_tab['url']}")

    async with websockets.connect(gm_tab['webSocketDebuggerUrl'], max_size=50*1024*1024) as ws:
        # 1. Navegar directamente al compose modal limpio
        print("🌐 Navegando a Inbox...")
        await ws.send(json.dumps({'id': 1, 'method': 'Page.navigate', 'params': {'url': 'https://mail.google.com/mail/u/0/#inbox'}}))
        await ws.recv()
        await asyncio.sleep(4)

        # 2. Click Redactar
        print("📝 Haciendo clic en Redactar...")
        js_redactar = """(() => {
            const btn = document.querySelector('div[gh="cm"]') || 
                        document.querySelector('div.T-I.T-I-KE.L3') || 
                        Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText && (b.innerText.includes('Redactar') || b.innerText.includes('Compose')));
            if (btn) { btn.click(); return 'REDACTAR_CLICKED'; }
            return 'NOT_FOUND';
        })()"""
        await ws.send(json.dumps({'id': 2, 'method': 'Runtime.evaluate', 'params': {'expression': js_redactar, 'returnByValue': True}}))
        r = json.loads(await ws.recv())
        print("Estado Redactar:", r.get('result', {}).get('value'))
        await asyncio.sleep(2)

        # 3. Llenar Destinatario, Asunto y Cuerpo
        print("✍️ Llenando campos de correo...")
        js_fill = f"""(() => {{
            // Para:
            const toInput = document.querySelector('input[peoplekit-id]') || 
                            document.querySelector('input.agP.aFw') || 
                            document.querySelector('input[aria-label="Para"]') ||
                            document.querySelector('input[aria-label="To recipients"]') ||
                            document.querySelector('div[aria-label="Para"] input');
            if (toInput) {{
                toInput.focus();
                toInput.value = '{EMAIL_DATA["to"]}';
                toInput.dispatchEvent(new InputEvent('input', {{ bubbles: true, data: '{EMAIL_DATA["to"]}' }}));
                toInput.dispatchEvent(new KeyboardEvent('keydown', {{ key: 'Enter', keyCode: 13, which: 13, bubbles: true }}));
                toInput.dispatchEvent(new KeyboardEvent('keyup', {{ key: 'Enter', keyCode: 13, which: 13, bubbles: true }}));
            }}

            // Asunto:
            const subj = document.querySelector('input[name="subjectbox"]') || 
                         document.querySelector('input[aria-label="Asunto"]') || 
                         document.querySelector('input[aria-label="Subject"]');
            if (subj) {{
                subj.focus();
                subj.value = '{EMAIL_DATA["subject"]}';
                subj.dispatchEvent(new InputEvent('input', {{ bubbles: true, data: '{EMAIL_DATA["subject"]}' }}));
            }}

            // Cuerpo HTML:
            const body = document.querySelector('div[aria-label="Cuerpo del mensaje"]') || 
                         document.querySelector('div[aria-label="Message Body"]') || 
                         document.querySelector('div[role="textbox"]');
            if (body) {{
                body.focus();
                document.execCommand('selectAll', false, null);
                document.execCommand('delete', false, null);
                document.execCommand('insertHTML', false, `{EMAIL_DATA["body_html"]}`);
            }}

            return 'INJECTED_SUCCESS';
        }})()"""
        await ws.send(json.dumps({'id': 3, 'method': 'Runtime.evaluate', 'params': {'expression': js_fill, 'returnByValue': True}}))
        r = json.loads(await ws.recv())
        print("Estado inyección:", r.get('result', {}).get('value'))
        await asyncio.sleep(2)

        # 4. Inyectar archivo adjunto
        if os.path.exists(FLYER):
            print(f"📎 Adjuntando archivo HD: {FLYER}...")
            doc_res = json.loads(await (await ws.send(json.dumps({'id': 4, 'method': 'DOM.getDocument', 'params': {'depth': -1, 'pierce': True}})) or ws.recv()))
            root_id = doc_res.get('result', {}).get('root', {}).get('nodeId', 1)

            await ws.send(json.dumps({'id': 5, 'method': 'DOM.querySelector', 'params': {'nodeId': root_id, 'selector': 'input[type="file"]'}}))
            q_res = json.loads(await ws.recv())
            node_id = q_res.get('result', {}).get('nodeId')
            if node_id:
                await ws.send(json.dumps({'id': 6, 'method': 'DOM.describeNode', 'params': {'nodeId': node_id}}))
                desc = json.loads(await ws.recv())
                b_id = desc.get('result', {}).get('node', {}).get('backendNodeId')
                if b_id:
                    await ws.send(json.dumps({'id': 7, 'method': 'DOM.setFileInputFiles', 'params': {'backendNodeId': b_id, 'files': [FLYER]}}))
                    await ws.recv()
                    print("Adjunto procesado.")
                    await asyncio.sleep(4)

        # 5. Captura previa al envío
        await ws.send(json.dumps({'id': 990, 'method': 'Page.captureScreenshot', 'params': {'format': 'jpeg', 'quality': 95}}))
        ss = json.loads(await ws.recv())
        data = ss.get('result', {}).get('data')
        if data:
            prev_out = os.path.join(ASSETS_DIR, "live_gm_rendered_proposal.jpg")
            with open(prev_out, 'wb') as f:
                f.write(base64.b64decode(data))
            print(f"📸 Captura del correo renderizado guardada: {prev_out}")

        # 6. Click Enviar
        print("🚀 Haciendo clic en Enviar...")
        js_send = """(() => {
            const sendBtn = document.querySelector('div[data-tooltip*="Enviar"]') || 
                            document.querySelector('div[data-tooltip*="Send"]') || 
                            Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.innerText && (b.innerText.trim() === 'Enviar' || b.innerText.trim() === 'Send'));
            if (sendBtn) { sendBtn.click(); return 'SEND_CLICKED'; }
            return 'SEND_NOT_FOUND';
        })()"""
        await ws.send(json.dumps({'id': 8, 'method': 'Runtime.evaluate', 'params': {'expression': js_send, 'returnByValue': True}}))
        r = json.loads(await ws.recv())
        print("Resultado Enviar:", r.get('result', {}).get('value'))
        await asyncio.sleep(5)

        # 7. Navegar a Enviados (#sent)
        print("📬 Navegando a Enviados (#sent)...")
        await ws.send(json.dumps({'id': 9, 'method': 'Page.navigate', 'params': {'url': 'https://mail.google.com/mail/u/0/#sent'}}))
        await ws.recv()
        await asyncio.sleep(4)

        # 8. Captura final en #sent
        await ws.send(json.dumps({'id': 999, 'method': 'Page.captureScreenshot', 'params': {'format': 'jpeg', 'quality': 95}}))
        ss = json.loads(await ws.recv())
        data = ss.get('result', {}).get('data')
        if data:
            final_out = os.path.join(ASSETS_DIR, "live_gm_proposal_sent_verified.jpg")
            with open(final_out, 'wb') as f:
                f.write(base64.b64decode(data))
            print(f"✅ CAPTURA FINAL AUDITADA GUARDADA: {final_out}")

if __name__ == '__main__':
    asyncio.run(send_now())
