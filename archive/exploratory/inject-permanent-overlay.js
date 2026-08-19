const { ConnectionManager } = require('../dist/connection');
const { ORIGINAL_HYPERION_OVERLAY_SCRIPT } = require('../dist/layers/overlay');

async function injectPermanentOverlay() {
  console.log('📌 Inyectando Overlay Persistente PERMANENTE en Chrome...');
  
  const tabsRes = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = await tabsRes.json();
  const tiktokTab = tabs.find(t => t.url.includes('tiktok.com'));

  if (!tiktokTab) throw new Error('Pestaña de TikTok no encontrada.');

  const cxn = new ConnectionManager({ mode: 'attach', websocketUrl: tiktokTab.webSocketDebuggerUrl });
  await cxn.connect();

  // Inyectar el overlay de forma autosostenible con bucle de refresco continuo
  await cxn.evaluate(`
    (function() {
      // 1. Limpieza de intervals previos
      if (window.__HY_PERMANENT_TIMER) clearInterval(window.__HY_PERMANENT_TIMER);
      window.__HY_KILL = false;
      window.__HY_KILL_ALL = false;

      // 2. Estilos permanentes
      if (!document.querySelector('.hy-st')) {
        var s = document.createElement('style');
        s.className = 'hy-st';
        s.textContent = '.hy-rr{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 11px/13px monospace;color:#fff;text-shadow:0 0 4px #000;padding:2px 4px;box-sizing:border-box;border:2px solid;border-radius:3px;backdrop-filter:saturate(130%);}';
        document.head.appendChild(s);
      }

      var C = [
        {f:'rgba(255,0,0,0.4)', b:'#FF0000'},
        {f:'rgba(0,200,0,0.4)', b:'#00CC00'},
        {f:'rgba(0,100,255,0.4)', b:'#0066FF'},
        {f:'rgba(200,200,0,0.4)', b:'#CCCC00'},
        {f:'rgba(200,0,200,0.4)', b:'#CC00CC'},
        {f:'rgba(0,200,200,0.4)', b:'#00CCCC'},
        {f:'rgba(255,128,0,0.4)', b:'#FF8000'},
        {f:'rgba(128,0,255,0.4)', b:'#8000FF'}
      ];

      function getActiveLayerData() {
        var w = window.innerWidth, h = window.innerHeight;
        var all = document.querySelectorAll('button, a[href], input, textarea, select, [role="button"], [role="menuitem"], [role="tab"], [role="link"], [role="switch"], [tabindex]:not([tabindex="-1"]), [contenteditable="true"]');
        var vis = [];

        for (var i = 0; i < all.length; i++) {
          try {
            var el = all[i];
            if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
            if (el.tagName === 'SVG' || el.tagName === 'PATH' || el.tagName === 'USE' || el.tagName === 'CIRCLE' || el.tagName === 'LINE') continue;
            var r = el.getBoundingClientRect();
            if (r.width < 12 || r.height < 12) continue;
            if (r.right < 0 || r.bottom < 0 || r.left > w || r.top > h) continue;

            var cx = Math.round(r.left + r.width / 2);
            var cy = Math.round(r.top + r.height / 2);
            if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;

            var at = document.elementsFromPoint(cx, cy);
            if (!at || at.length === 0) continue;
            var top = at[0];
            var onTop = (top === el || el.contains(top));
            if (!onTop) {
              var p = top;
              for (var j = 0; j < 5; j++) {
                if (p === el) { onTop = true; break; }
                if (!p || p === document.body) break;
                p = p.parentElement;
              }
            }
            if (!onTop) continue;

            var text = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 25);
            var aria = el.getAttribute('aria-label') || '';
            var label = text || aria || el.tagName.toLowerCase();
            if (!label) continue;

            vis.push({ el: el, rect: r, text: label.slice(0, 20), tag: el.tagName.toLowerCase(), cx: cx, cy: cy });
          } catch(e){}
        }

        var dialogEls = [], otherEls = [];
        for (var i = 0; i < vis.length; i++) {
          var el = vis[i].el, inDialog = false;
          var p = el.parentElement;
          while (p && p !== document.body) {
            var role = p.getAttribute('role') || '';
            var z = parseInt(window.getComputedStyle(p).zIndex) || 0;
            if (role === 'dialog' || p.tagName === 'DIALOG' || (z > 100 && p.offsetWidth > 50)) {
              inDialog = true;
              break;
            }
            p = p.parentElement;
          }
          if (inDialog) dialogEls.push(vis[i]); else otherEls.push(vis[i]);
        }

        if (dialogEls.length >= 2) {
          return { type: 'DIALOG', elements: dialogEls };
        }
        return { type: 'VISIBLE', elements: otherEls };
      }

      function render() {
        try {
          document.querySelectorAll('.hy-rr').forEach(function(e){ e.remove(); });
          var layer = getActiveLayerData();
          var els = layer.elements || [];

          // Header Badge de Estado Permanente
          var info = document.createElement('div');
          info.className = 'hy-rr';
          info.style.cssText = 'top:4px;left:50%;transform:translateX(-50%);padding:4px 14px;background:rgba(0,0,0,0.9);border-radius:4px;font:bold 12px/15px monospace;color:#0f0;border:1px solid #0f0;z-index:2147483647;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,0.5);';
          info.textContent = 'HYPERION OVERLAY PERMANENTE [' + layer.type + ' - ' + els.length + ' el]';
          document.body.appendChild(info);

          for (var i = 0; i < els.length; i++) {
            var e = els[i], r = e.rect, c = C[i % C.length];
            var d = document.createElement('div');
            d.className = 'hy-rr';
            d.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;background:' + c.f + ';border:2px solid ' + c.b + ';z-index:2147483647;';
            d.textContent = '[' + (i + 1) + '] ' + e.text.slice(0, 15);
            document.body.appendChild(d);

            e.el.setAttribute('data-hy-num', (i + 1).toString());
          }
        } catch(e){}
      }

      render();

      // Timer autosostenible dentro del navegador
      window.__HY_PERMANENT_TIMER = setInterval(render, 1500);
      window.addEventListener('resize', render);
      return true;
    })()
  `);

  console.log('✅ Overlay Permanente activado en Chrome. Los recuadros y capas permanecerán visibles continuamente.');
  await cxn.disconnect();
}

injectPermanentOverlay().catch(console.error);
