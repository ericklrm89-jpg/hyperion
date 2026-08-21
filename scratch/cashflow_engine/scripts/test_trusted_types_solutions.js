const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CDP_PORT = 9001;
const ASSETS_DIR = 'C:\\Users\\erick\\.gemini\\antigravity-ide\\scratch\\cashflow_engine\\public\\assets';

function getTabs() {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${CDP_PORT}/json`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function run() {
  const tabs = await getTabs();
  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com/mail/u/'));
  const ws = new WebSocket(gmTab.webSocketDebuggerUrl);

  ws.on('open', async () => {
    const call = (method, params = {}) => new Promise((resolve) => {
      const id = Math.floor(Math.random() * 99999);
      const h = (d) => {
        const j = JSON.parse(d);
        if (j.id === id) {
          ws.removeListener('message', h);
          resolve(j);
        }
      };
      ws.on('message', h);
      ws.send(JSON.stringify({ id, method, params }));
    });

    console.log('1. Habilitando Bypass CSP vía CDP...');
    await call('Page.setBypassCSP', { enabled: true });

    console.log('2. Construyendo DOM enriquecido nativo (Immune a TrustedHTML)...');
    const buildDomScript = `(() => {
      const editor = document.querySelector('div.editable[aria-label="Cuerpo del mensaje"]');
      if (!editor) return { success: false, reason: 'NO_EDITOR' };

      editor.focus();
      while (editor.firstChild) {
        editor.removeChild(editor.firstChild);
      }

      // Container Card
      const card = document.createElement('div');
      card.style.cssText = 'font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; color: #0f172a; line-height: 1.5; padding: 18px; background: #ffffff; border: 2px solid #2563eb; border-radius: 12px; max-width: 620px;';

      // Header
      const header = document.createElement('div');
      header.style.cssText = 'border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;';
      
      const logo = document.createElement('span');
      logo.style.cssText = 'font-size: 20px; font-weight: 900; color: #0f172a;';
      logo.innerText = '⚡ NanoAI Industrial OS';
      
      const badge = document.createElement('span');
      badge.style.cssText = 'background: #2563eb; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; float: right;';
      badge.innerText = '100% AIR-GAPPED';

      header.appendChild(logo);
      header.appendChild(badge);
      card.appendChild(header);

      // Hook Title
      const h3 = document.createElement('h3');
      h3.style.cssText = 'font-size: 15px; font-weight: 900; color: #0f172a; margin: 0 0 8px 0;';
      h3.innerText = '¿Cuánto le cuesta al mes mantener personal técnico para cotizar tirajes y calcular despiece?';
      card.appendChild(h3);

      // Paragraph
      const p1 = document.createElement('p');
      p1.style.cssText = 'font-size: 12.5px; color: #475569; margin: 0 0 12px 0;';
      p1.innerHTML = '<strong>Estimada Gerencia de Operaciones y Dirección General:</strong><br>En plantas industriales en Quito, mantener 2 a 3 técnicos cotizadores representa más de <strong style=\"color:#dc2626;\">$3,600 USD mensuales en nómina fija e IESS</strong>... sumado al riesgo de cotizaciones lentas (48h) o descarte excesivo de material.';
      card.appendChild(p1);

      // Comparison Table
      const table = document.createElement('table');
      table.style.cssText = 'border-collapse: collapse; width: 100%; font-size: 12px; margin-bottom: 14px; border: 1px solid #cbd5e1;';
      
      const thead = document.createElement('tr');
      thead.style.cssText = 'background: #0f172a; color: #ffffff;';
      
      const th1 = document.createElement('th'); th1.style.cssText = 'padding: 6px; text-align: left;'; th1.innerText = 'Concepto Operativo';
      const th2 = document.createElement('th'); th2.style.cssText = 'padding: 6px; text-align: center;'; th2.innerText = 'Personal Manual (3 Personas)';
      const th3 = document.createElement('th'); th3.style.cssText = 'padding: 6px; text-align: right;'; th3.innerText = 'NanoAI On-Premise';
      thead.appendChild(th1); thead.appendChild(th2); thead.appendChild(th3);
      table.appendChild(thead);

      const rowsData = [
        ['Nómina Fija (Sueldos + IESS):', '-$3,600 USD / mes', '$0 nómina recurrente', '#dc2626', '#16a34a'],
        ['Tiempo de Cotización:', '24 a 48 horas', '< 45 segundos en vivo', '#64748b', '#2563eb'],
        ['Merma y Fuga de Material:', '8% a 15% del costo', '< 2% (Nesting algorítmico)', '#64748b', '#16a34a'],
        ['Recuperación Neta en Caja:', 'Pérdida continua', '+$4,200 USD / mes', '#dc2626', '#16a34a']
      ];

      rowsData.forEach(([c1, c2, c3, col2, col3], idx) => {
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom: 1px solid #e2e8f0;';
        if (idx === rowsData.length - 1) tr.style.fontWeight = 'bold';
        
        const td1 = document.createElement('td'); td1.style.cssText = 'padding: 6px;'; td1.innerText = c1;
        const td2 = document.createElement('td'); td2.style.cssText = 'padding: 6px; text-align: center; color: ' + col2 + '; font-weight: bold;'; td2.innerText = c2;
        const td3 = document.createElement('td'); td3.style.cssText = 'padding: 6px; text-align: right; color: ' + col3 + '; font-weight: bold; font-size: ' + (idx === 3 ? '13.5px' : '12px') + ';'; td3.innerText = c3;
        
        tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
        table.appendChild(tr);
      });
      card.appendChild(table);

      // Hormozi Offer Card
      const offer = document.createElement('div');
      offer.style.cssText = 'background: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 8px; padding: 10px; margin-bottom: 12px; font-size: 12px; color: #1e3a8a;';
      offer.innerHTML = '🎁 <strong>OFERTA HORMOZI DE LANZAMIENTO (QUITO):</strong><br>Incluye <strong>3 MESES GRATIS DE SOPORTE TÉCNICO</strong> más una <strong>visita técnica presencial de 20 minutos</strong> en su planta por nuestro Director Técnico, Erick.';
      card.appendChild(offer);

      // CTA Button
      const ctaWrap = document.createElement('div');
      ctaWrap.style.cssText = 'text-align: center; margin-bottom: 10px;';
      const ctaBtn = document.createElement('a');
      ctaBtn.href = 'https://wa.me/593998098229?text=Hola%20Erick,%20deseo%20coordinar%20la%20visita%20tecnica%20de%20NanoAI';
      ctaBtn.style.cssText = 'background: #0f172a; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 12.5px; display: inline-block; border: 2px solid #2563eb;';
      ctaBtn.innerText = '📅 Agendar Demostración Técnica de 20 Minutos';
      ctaWrap.appendChild(ctaBtn);
      card.appendChild(ctaWrap);

      // Signoff
      const signoff = document.createElement('div');
      signoff.style.cssText = 'border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 11px; color: #64748b;';
      signoff.innerHTML = '<strong>Erick R.</strong> &bull; Director Técnico — NanoAI Ecuador &bull; WhatsApp Directo: +593 99 809 8229<br><a href=\"https://nanoai.ec\" style=\"color: #2563eb; text-decoration: none; font-weight: bold;\">https://nanoai.ec</a>';
      card.appendChild(signoff);

      editor.appendChild(card);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.dispatchEvent(new Event('change', { bubbles: true }));

      return {
        success: true,
        childCount: editor.children.length,
        text: editor.innerText.slice(0, 80)
      };
    })()`;

    const res = await call('Runtime.evaluate', { expression: buildDomScript, returnByValue: true });
    console.log('RESULTADO CONSTRUCCIÓN DOM:', JSON.stringify(res, null, 2));

    await new Promise(r => setTimeout(r, 1200));

    // Tomar captura
    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap && snap.result && snap.result.data) {
      const out = path.join(ASSETS_DIR, 'live_gm_html_rendered_live.jpg');
      fs.writeFileSync(out, Buffer.from(snap.result.data, 'base64'));
      console.log('✅ CAPTURA CON TABLA NATIVA GUARDADA:', out);
    }

    ws.close();
  });
}

run();
