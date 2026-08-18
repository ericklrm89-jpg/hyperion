const WebSocket = require('ws');
const http = require('http');

async function getCDPTarget() {
    return new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9222/json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const targets = JSON.parse(data);
                    const target = targets.find(t => t.url.includes('squarespace') || t.url.includes('sanantonio')) || targets.find(t => t.type === 'page');
                    resolve(target);
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

async function runHyperionDNSFix() {
    console.log("🚀 Iniciando Motor Hyperion para actualización de DNS en Squarespace...");
    try {
        const target = await getCDPTarget();
        if (!target) {
            console.error("❌ No se encontró ninguna pestaña de Chrome en el puerto 9222.");
            return;
        }

        console.log("📌 Conectado a pestaña:", target.title, target.url);
        const ws = new WebSocket(target.webSocketDebuggerUrl);

        ws.on('open', async () => {
            console.log("⚡ Conexión CDP establecida con Hyperion Engine.");
            
            // Habilitar notificaciones y eventos nativos
            await cdpCall(ws, 'Page.enable');
            await cdpCall(ws, 'DOM.enable');

            // 1. Inyectar Capa Manus de Hyperion
            console.log("🎨 Inyectando Capa Manus de Hyperion...");
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

                  var C = [{f:'rgba(255,0,0,0.4)', b:'#F00'}, {f:'rgba(0,200,0,0.4)', b:'#0C0'}, {f:'rgba(0,100,255,0.4)', b:'#06F'}];

                  function render(){
                    try {
                      document.querySelectorAll('.hy-rr').forEach(e => e.remove());
                      var info = document.createElement('div');
                      info.className = 'hy-rr';
                      info.style.cssText = 'top:3px;left:50%;transform:translateX(-50%);padding:3px 10px;background:rgba(0,0,0,0.85);border-radius:4px;font:bold 12px monospace;color:#0f0;border:1px solid #0f0;white-space:nowrap;';
                      info.textContent = 'CAPA ACTIVA: HYPERION_MANUS_ACTIVE [AUTOMATOR READY]';
                      document.body.appendChild(info);
                    } catch(e){}
                  }

                  render();
                  window.__HY_SINGLE_TIMER = setInterval(render, 250);
                })();
                `
            });

            // 2. Si no estamos en la página de DNS de Squarespace, navegar a ella
            if (!target.url.includes('sanantonioresponde.org/dns')) {
                console.log("🌐 Navegando a la página de administración de DNS en Squarespace...");
                await cdpCall(ws, 'Page.navigate', { url: 'https://account.squarespace.com/domains/managed/sanantonioresponde.org/dns' });
            }

            console.log("✅ Pestaña sincronizada con Hyperion.");
        });
    } catch (e) {
        console.error("❌ Error en Motor Hyperion:", e.message);
    }
}

runHyperionDNSFix();
