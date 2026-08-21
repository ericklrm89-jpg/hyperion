/**
 * HYPERION UNIVERSAL MANUS OVERLAY ENGINE v3.2 (CSP & TrustedTypes Immune)
 * 
 * 1. Cero dependencia de etiquetas <style> (100% estilos inline directos).
 * 2. Mapeo completo de todos los elementos interactivos y botones.
 * 3. Supresión de duplicados geométricos reales (delta < 4px).
 * 4. Paleta de 6 colores contrastantes Manus.
 * 5. Bucle dinámico 250ms con Singleton Guard.
 */

const ROBUST_MANUS_ENGINE = `
(function(){
  if (window.__HY_SINGLE_TIMER) {
    clearInterval(window.__HY_SINGLE_TIMER);
    window.__HY_SINGLE_TIMER = null;
  }

  // Limpiar capas previas
  document.querySelectorAll('.hy-el, .hy-st, .hy-rr, #hyperion-manus-root, style[id*="hyperion"]').forEach(function(e){ e.remove(); });

  var PALETTE = [
    { fill: 'rgba(239, 68, 68, 0.16)',  border: '#ef4444', badge: '#ef4444', text: '#ffffff' }, // Rojo
    { fill: 'rgba(34, 197, 94, 0.16)',  border: '#22c55e', badge: '#22c55e', text: '#000000' }, // Verde
    { fill: 'rgba(59, 130, 246, 0.16)', border: '#3b82f6', badge: '#3b82f6', text: '#ffffff' }, // Azul
    { fill: 'rgba(234, 179, 8, 0.16)',  border: '#eab308', badge: '#eab308', text: '#000000' }, // Amarillo
    { fill: 'rgba(168, 85, 247, 0.16)', border: '#a855f7', badge: '#a855f7', text: '#ffffff' }, // Violeta
    { fill: 'rgba(236, 72, 153, 0.16)', border: '#ec4899', badge: '#ec4899', text: '#ffffff' }  // Rosa
  ];

  function getDeepElements(root) {
    root = root || document;
    var selector = 'button, a, input, textarea, select, [role="button"], [role="menuitem"], [role="tab"], [role="link"], [role="switch"], [role="checkbox"], [role="textbox"], [role="listitem"], [role="option"], [data-tab], [data-icon], span[data-icon], [contenteditable="true"], [tabindex]:not([tabindex="-1"])';
    var els = Array.from(root.querySelectorAll(selector));
    var allNodes = Array.from(root.querySelectorAll('*'));
    for (var i = 0; i < allNodes.length; i++) {
      if (allNodes[i].shadowRoot) {
        els = els.concat(getDeepElements(allNodes[i].shadowRoot));
      }
    }
    return els;
  }

  function getActiveElements() {
    var w = window.innerWidth, h = window.innerHeight;
    var raw = getDeepElements(document);
    var seenKeys = new Map();
    var valid = [];

    for (var i = 0; i < raw.length; i++) {
      try {
        var el = raw[i];
        if (el.id === 'hyperion-manus-root' || el.closest('#hyperion-manus-root')) continue;
        if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;

        var r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) continue;
        if (r.right < 0 || r.bottom < 0 || r.left > w || r.top > h) continue;

        var aria = el.getAttribute('aria-label') || 
                   el.getAttribute('title') || 
                   el.getAttribute('placeholder') || 
                   el.getAttribute('data-icon') || 
                   el.getAttribute('name') || '';
        var rawText = aria || el.textContent || '';
        var cleanText = rawText.replace(/[\\u200b-\\u200f\\ufeff\\u00ad]/g, '').replace(/\\s+/g, ' ').trim().slice(0, 18);
        if (!cleanText && el.tagName !== 'INPUT' && el.tagName !== 'BUTTON') continue;
        if (!cleanText) cleanText = el.tagName.toLowerCase();

        var geoKey = Math.round(r.left / 4) * 4 + '_' + 
                     Math.round(r.top / 4) * 4 + '_' + 
                     Math.round(r.width / 4) * 4 + '_' + 
                     Math.round(r.height / 4) * 4;

        if (seenKeys.has(geoKey)) {
          var existing = seenKeys.get(geoKey);
          if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || (cleanText.length > existing.text.length && existing.el.tagName !== 'BUTTON')) {
            existing.el = el;
            existing.text = cleanText;
            existing.rect = r;
          }
          continue;
        }

        var item = { el: el, rect: r, text: cleanText };
        seenKeys.set(geoKey, item);
        valid.push(item);
      } catch(e) {}
    }

    return valid;
  }

  function render() {
    try {
      var root = document.getElementById('hyperion-manus-root');
      if (!root) {
        root = document.createElement('div');
        root.id = 'hyperion-manus-root';
        root.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647;overflow:hidden;';
        document.body.appendChild(root);
      }

      while (root.firstChild) {
        root.removeChild(root.firstChild);
      }

      var els = getActiveElements();

      var banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;top:4px;left:50%;transform:translateX(-50%);padding:4px 18px;background:rgba(15,23,42,0.96);border:2px solid #22c55e;border-radius:20px;font:bold 12px monospace;color:#22c55e;white-space:nowrap;box-shadow:0 6px 16px rgba(0,0,0,0.8);z-index:2147483647;pointer-events:none;';
      banner.innerText = '⚡ CAPA MANUS COMPLETA [' + els.length + ' ELEMENTOS ACTIVOS]';
      root.appendChild(banner);

      for (var i = 0; i < els.length; i++) {
        var item = els[i];
        var r = item.rect;
        var c = PALETTE[i % PALETTE.length];

        var box = document.createElement('div');
        box.style.cssText = 'position:fixed;pointer-events:none;box-sizing:border-box;border:2px solid ' + c.border + ';border-radius:3px;z-index:2147483647;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;background:' + c.fill + ';';

        var tag = document.createElement('div');
        tag.style.cssText = 'position:absolute;top:0;left:0;font:bold 10.5px/12px monospace;padding:1px 4px;border-bottom-right-radius:3px;text-shadow:0 0 2px #000;white-space:nowrap;z-index:2147483647;background:' + c.badge + ';color:' + c.text + ';';
        tag.innerText = '[' + (i + 1) + '] ' + item.text;

        box.appendChild(tag);
        root.appendChild(box);
      }
    } catch(e) {}
  }

  render();
  window.__HY_SINGLE_TIMER = setInterval(render, 250);
})();
`;

module.exports = { ROBUST_MANUS_ENGINE };
