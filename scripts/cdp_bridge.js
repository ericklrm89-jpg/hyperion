const WebSocket = require('ws');
const http = require('http');

const CDP_HTTP = 'http://localhost:9222';

async function getTabs() {
  return new Promise((resolve, reject) => {
    http.get(`${CDP_HTTP}/json`, (res) => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data || '[]')));
    }).on('error', reject);
  });
}

let _id = 1;
function cdp(ws, method, params = {}, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const id = _id++;
    const timer = setTimeout(() => { ws.off('message', h); reject(new Error(`Timeout: ${method}`)); }, timeoutMs);
    const h = (data) => {
      const r = JSON.parse(data.toString());
      if (r.id === id) {
        clearTimeout(timer);
        ws.off('message', h);
        if (r.error) reject(new Error(r.error.message));
        else resolve(r.result);
      }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function getRealWhatsAppChats() {
  const tabs = await getTabs();
  const waTab = tabs.find(t => t.url && t.url.includes('web.whatsapp.com') && t.type === 'page') ||
                tabs.find(t => t.url && t.url.includes('web.whatsapp.com'));
  if (!waTab) return { status: 'error', message: 'WhatsApp Web no encontrado' };

  const ws = new WebSocket(waTab.webSocketDebuggerUrl);
  await new Promise((r, e) => { ws.on('open', r); ws.on('error', e); });

  const js = `
  (() => {
    const chats = [];
    const elements = document.querySelectorAll('#pane-side [role="listitem"], [data-testid="chat-list"] [role="row"], #pane-side > div > div > div > div');
    elements.forEach(el => {
      const titleEl = el.querySelector('[title]');
      const title = titleEl ? titleEl.getAttribute('title') : '';
      const text = el.innerText || '';
      const lines = text.split('\\n').filter(Boolean);
      if (title && title.length > 1) {
        chats.push({
          title,
          time: lines[lines.length - 2] || '',
          lastMsg: lines[lines.length - 1] || ''
        });
      }
    });
    // Remove duplicates
    const unique = [];
    const seen = new Set();
    for (const c of chats) {
      if (!seen.has(c.title)) {
        seen.add(c.title);
        unique.push(c);
      }
    }
    return unique.slice(0, 15);
  })()
  `;

  const res = await cdp(ws, 'Runtime.evaluate', { expression: js, returnByValue: true });
  ws.close();
  return { status: 'ok', count: (res.result?.value || []).length, chats: res.result?.value || [] };
}

async function getRealGmailInbox() {
  const tabs = await getTabs();
  const gmailTab = tabs.find(t => t.url && t.url.includes('mail.google.com') && t.type === 'page') ||
                   tabs.find(t => t.url && t.url.includes('mail.google.com'));
  if (!gmailTab) return { status: 'error', message: 'Gmail no encontrado' };

  const ws = new WebSocket(gmailTab.webSocketDebuggerUrl);
  await new Promise((r, e) => { ws.on('open', r); ws.on('error', e); });

  const js = `
  (() => {
    const emails = [];
    const rows = document.querySelectorAll('tr[role="row"]');
    rows.forEach(r => {
      const senders = r.querySelector('[email], .zF, .yP');
      const sender = senders ? (senders.getAttribute('name') || senders.innerText) : '';
      const subj = r.querySelector('.bog, .bqe');
      const subject = subj ? subj.innerText : '';
      const dateEl = r.querySelector('.xW, .bq3');
      const date = dateEl ? dateEl.innerText : '';
      if (sender || subject) {
        emails.push({ sender, subject, date });
      }
    });
    return emails.slice(0, 10);
  })()
  `;

  const res = await cdp(ws, 'Runtime.evaluate', { expression: js, returnByValue: true });
  ws.close();
  return { status: 'ok', count: (res.result?.value || []).length, emails: res.result?.value || [] };
}

async function sendWhatsAppMessage(phone, messageText) {
  const tabs = await getTabs();
  const waTab = tabs.find(t => t.url && t.url.includes('web.whatsapp.com') && t.type === 'page') ||
                tabs.find(t => t.url && t.url.includes('web.whatsapp.com'));
  if (!waTab) return { success: false, reason: 'WhatsApp Web no encontrado' };

  const ws = new WebSocket(waTab.webSocketDebuggerUrl);
  await new Promise((r, e) => { ws.on('open', r); ws.on('error', e); });

  // If phone is provided, navigate directly to send URL
  if (phone && phone.length > 6) {
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('09')) cleanPhone = '593' + cleanPhone.slice(1);
    if (!cleanPhone.startsWith('593') && cleanPhone.length === 9) cleanPhone = '593' + cleanPhone;

    const targetUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;
    await cdp(ws, 'Page.navigate', { url: targetUrl });
    
    // Wait for chat to load (5 seconds)
    await new Promise(r => setTimeout(r, 5000));
  }

  const js = `
  (() => {
    const inputBox = document.querySelector('footer div[contenteditable="true"]') ||
                     document.querySelector('div[role="textbox"][contenteditable="true"]');
    if (inputBox) {
      inputBox.focus();
      const sendBtn = document.querySelector('footer button[aria-label*="Enviar"], footer span[data-icon="send"]');
      if (sendBtn) {
        const btn = sendBtn.closest('button') || sendBtn;
        btn.click();
        return { success: true, method: 'click_send' };
      }
    }
    return { success: true, method: 'url_preloaded' };
  })()
  `;

  const res = await cdp(ws, 'Runtime.evaluate', { expression: js, returnByValue: true });
  ws.close();
  return res.result?.value || { success: true };
}

// CLI Mode
if (require.main === module) {
  const action = process.argv[2] || 'all';
  (async () => {
    if (action === 'wa' || action === 'all') {
      const wa = await getRealWhatsAppChats();
      console.log('--- WHATSAPP REAL ---');
      console.log(JSON.stringify(wa, null, 2));
    }
    if (action === 'gmail' || action === 'all') {
      const gm = await getRealGmailInbox();
      console.log('--- GMAIL REAL ---');
      console.log(JSON.stringify(gm, null, 2));
    }
    if (action === 'send_wa') {
      const arg1 = process.argv[3] || '';
      const arg2 = process.argv[4] || '';
      let phone = '';
      let text = '';
      if (arg2) {
        phone = arg1;
        text = arg2;
      } else {
        text = arg1 || 'Mensaje de prueba desde NanoAI';
      }
      const r = await sendWhatsAppMessage(phone, text);
      console.log('--- ENVIO WA ---', r);
    }
  })().catch(console.error);
}

module.exports = { getRealWhatsAppChats, getRealGmailInbox, sendWhatsAppMessage };
