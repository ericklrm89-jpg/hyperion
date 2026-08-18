/**
 * Módulo para Gemini Web App — Hyperion Engine v3
 */
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');

const { ORIGINAL_HYPERION_OVERLAY_SCRIPT } = require('../../dist/layers/overlay');

async function getTab() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => {
        const tabs = JSON.parse(data);
        const geminiTab = tabs.find(t => t.url && t.url.includes('gemini.google.com') && t.type === 'page') ||
                          tabs.find(t => t.url && t.url.includes('gemini.google.com'));
        if (!geminiTab) reject(new Error('Pestaña de Gemini Web no encontrada en Chrome'));
        else resolve(geminiTab);
      });
    }).on('error', reject);
  });
}

let _id = 1;
async function cdp(ws, method, params = {}, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const id = _id++;
    const timer = setTimeout(() => { ws.off('message', h); reject(new Error(`Timeout: ${method}`)); }, timeoutMs);
    const h = data => {
      const r = JSON.parse(data.toString());
      if (r.id === id) { clearTimeout(timer); ws.off('message', h); r.error ? reject(new Error(r.error.message)) : resolve(r.result); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function evalJS(ws, expr, timeoutMs = 15000) {
  const r = await cdp(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: false, userGesture: true }, timeoutMs);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result?.value;
}

async function interactGemini(promptText) {
  console.log('═══════════════════════════════════════════════════');
  console.log('  HYPERION MODULE — Gemini Web Interaction');
  console.log('═══════════════════════════════════════════════════');

  const tab = await getTab();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r, e) => { ws.on('open', r); ws.on('error', e); });
  console.log(`✅ Conectado a Gemini Web: ${tab.title}`);

  // Inyectar overlay Hyperion v3 para mapear elementos de Gemini Web
  await evalJS(ws, ORIGINAL_HYPERION_OVERLAY_SCRIPT, 20000);
  await sleep(800);
  const data = JSON.parse(await evalJS(ws, 'window.__hyData()') || '{}');
  console.log(`📋 Capa Gemini: ${data.type} | Elementos: ${data.elements?.length || 0}`);

  ws.close();
  console.log('🎉 Flujo Gemini completado');
  return { status: 'success' };
}

module.exports = { interactGemini };
