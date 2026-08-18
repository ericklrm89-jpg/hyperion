const { ConnectionManager } = require('../dist/connection');

async function killCompetingOverlayProcesses() {
  console.log('🧹 Ejecutando limpieza agresiva de procesos de capas competidores...');
  
  const tabsRes = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = await tabsRes.json();
  const tiktokTab = tabs.find(t => t.url.includes('tiktok.com'));

  if (!tiktokTab) throw new Error('Pestaña de TikTok no encontrada.');

  const cxn = new ConnectionManager({ mode: 'attach', websocketUrl: tiktokTab.webSocketDebuggerUrl });
  await cxn.connect();

  // Limpieza total de 0 a 200,000 intervals y remoción de nodos
  await cxn.evaluate(`
    (function() {
      // 1. Matar todos los intervalos y timeouts existentes
      for (var i = 0; i < 200000; i++) {
        try { clearInterval(i); } catch(e){}
        try { clearTimeout(i); } catch(e){}
      }

      // 2. Desactivar flags globales
      window.__HY_KILL_ALL = true;
      window.__HY_KILL = true;
      if (window.__HY_TIMER) clearInterval(window.__HY_TIMER);
      window.__HY_TIMER = null;

      // 3. Eliminar todos los elementos de overlay duplicados en el DOM
      document.querySelectorAll('.hy-rr, .hy-st, .hy-tp, .hy-ov, .hy-box, .hy-intel, .hy-intel-style, .hy-el').forEach(function(e) {
        e.remove();
      });

      console.log('✅ Todos los procesos e intervalos competidores han sido eliminados.');
      return true;
    })()
  `);

  console.log('✨ Limpieza de procesos competidores finalizada exitosamente.');
  await cxn.disconnect();
}

killCompetingOverlayProcesses().catch(console.error);
