const WebSocket = require('ws');
const http = require('http');

async function getVisibleTab() {
    return new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9222/json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const targets = JSON.parse(data);
                    console.log("Pestañas encontradas en Chrome GUI:", targets.map(t => ({ title: t.title, url: t.url })));
                    const tab = targets.find(t => t.type === 'page');
                    resolve(tab);
                } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

function cdpCall(ws, method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 999999);
        const handler = (data) => {
            try {
                const res = JSON.parse(data);
                if (res.id === id) {
                    ws.removeListener('message', handler);
                    if (res.error) reject(new Error(JSON.stringify(res.error)));
                    else resolve(res.result || {});
                }
            } catch(e) {}
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
    });
}

async function runGuiAutomation() {
    console.log("🚀 Hyperion conectando a la ventana GUI de Chrome activa...");
    try {
        const tab = await getVisibleTab();
        if (!tab) {
            console.error("❌ No se encontró la ventana GUI de Chrome en el puerto 9222.");
            return;
        }

        console.log("✅ Conectado a la ventana GUI:", tab.title, "URL:", tab.url);
        const ws = new WebSocket(tab.webSocketDebuggerUrl);

        ws.on('open', async () => {
            console.log("⚡ Conexión WebSocket CDP lista.");
            await cdpCall(ws, 'Page.enable');
            await cdpCall(ws, 'DOM.enable');

            // Inyectar Capa Manus Dinámica
            console.log("🎨 Inyectando Capa Manus de Hyperion en el navegador GUI...");
            await cdpCall(ws, 'Runtime.evaluate', {
                expression: `
                (function(){
                  try {
                    if (window.__HY_SINGLE_TIMER) clearInterval(window.__HY_SINGLE_TIMER);
                    document.querySelectorAll('.hy-rr').forEach(e => e.remove());
                  } catch(e){}

                  if(!document.querySelector('.hy-st')){
                    var s = document.createElement('style');
                    s.className = 'hy-st';
                    s.textContent = '.hy-rr{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 11px/13px monospace;color:#fff;text-shadow:0 0 3px #000,0 0 6px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;}';
                    document.head.appendChild(s);
                  }

                  function render(){
                    try {
                      document.querySelectorAll('.hy-rr').forEach(e => e.remove());
                      var info = document.createElement('div');
                      info.className = 'hy-rr';
                      info.style.cssText = 'top:3px;left:50%;transform:translateX(-50%);padding:4px 12px;background:rgba(0,0,0,0.9);border-radius:4px;font:bold 13px monospace;color:#0f0;border:2px solid #0f0;white-space:nowrap;';
                      info.textContent = 'CAPA ACTIVA: HYPERION_MANUS_ACTIVE [GUI CHROME DIEGO]';
                      document.body.appendChild(info);
                    } catch(e){}
                  }

                  render();
                  window.__HY_SINGLE_TIMER = setInterval(render, 250);
                })();
                `
            });

            console.log("✅ Capa Manus activa en el Chrome visible.");
        });
    } catch (e) {
        console.error("❌ Error en Hyperion GUI script:", e.message);
    }
}

runGuiAutomation();
