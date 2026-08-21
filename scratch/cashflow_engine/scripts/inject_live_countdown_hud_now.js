/**
 * INYECTOR INMEDIATO DE LIVE COUNTDOWN HUD EN WHATSAPP Y GMAIL (PUERTO 9001)
 */

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { generateLiveHudEngine } = require('./hyperion_live_countdown_hud');

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

async function injectHudToTabs() {
  const tabs = await getTabs();
  const waTab = tabs.find(t => t.type === 'page' && t.url.includes('web.whatsapp.com'));
  const gmTab = tabs.find(t => t.type === 'page' && t.url.includes('mail.google.com/mail/u/'));

  const hudCode = generateLiveHudEngine(
    'ECUACHEMLAB (Laboratorio Químico)',
    'PLASTEX (Soluciones Plásticas Industriales)',
    180, // ~3 minutos restantes
    4,
    5000
  );

  if (waTab) {
    console.log('Inyectando Live Countdown HUD en WhatsApp Web...');
    const ws = new WebSocket(waTab.webSocketDebuggerUrl);
    await new Promise(r => ws.on('open', r));
    const call = createCdpCaller(ws);
    await call('Runtime.evaluate', { expression: hudCode });
    await new Promise(r => setTimeout(r, 1000));
    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap?.data) {
      const snapPath = path.join(ASSETS_DIR, 'live_wa_with_countdown_hud.jpg');
      fs.writeFileSync(snapPath, Buffer.from(snap.data, 'base64'));
      console.log(`✅ [WHATSAPP] Captura con Contador en Vivo: ${snapPath}`);
    }
    ws.close();
  }

  if (gmTab) {
    console.log('Inyectando Live Countdown HUD en Gmail...');
    const ws = new WebSocket(gmTab.webSocketDebuggerUrl);
    await new Promise(r => ws.on('open', r));
    const call = createCdpCaller(ws);
    await call('Runtime.evaluate', { expression: hudCode });
    await new Promise(r => setTimeout(r, 1000));
    const snap = await call('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
    if (snap?.data) {
      const snapPath = path.join(ASSETS_DIR, 'live_gm_with_countdown_hud.jpg');
      fs.writeFileSync(snapPath, Buffer.from(snap.data, 'base64'));
      console.log(`✅ [GMAIL] Captura con Contador en Vivo: ${snapPath}`);
    }
    ws.close();
  }
}

injectHudToTabs();
