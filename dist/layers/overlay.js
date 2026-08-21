"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverlayPrimitive = void 0;
const detector_1 = require("./detector");
const logger_1 = require("../core/logger");
/**
 * OverlayPrimitive (Capa Manus Singleton)
 * Guarantees STRICTLY ONE SINGLE OVERLAY instance in the browser at all times.
 * Automatically destroys any previous layers before starting.
 */
class OverlayPrimitive {
    constructor(cxn) {
        this.injected = false;
        this.defaultConfig = {
            intervalMs: 250,
            includePostLinks: true,
            gridSize: 200,
            zIndex: 2147483647
        };
        this.cxn = cxn;
        this.detector = new detector_1.LayerDetector(cxn);
    }
    async inject(config) {
        const cfg = { ...this.defaultConfig, ...config };
        // Atomic pre-cleanup to prevent overlay-on-overlay stacking
        await this.kill(false);
        const js = this.buildOverlayJS(cfg);
        await this.cxn.evaluate(js);
        const check = await this.cxn.evaluate('typeof window.__hyData === "function"');
        if (!check?.value)
            throw new Error('Overlay injection failed');
        this.injected = true;
        logger_1.logger.info('[Overlay/Manus] Capa Manus multicolor singleton inyectada (0 capas duplicadas)');
    }
    async kill(keepStyles = false) {
        await this.cxn.evaluate(`
      (function(){
        try {
          if (window.__HYT) { clearInterval(window.__HYT); delete window.__HYT; }
          if (window.__HY_MANUS_SINGLETON && typeof window.__HY_MANUS_SINGLETON.destroy === 'function') {
            window.__HY_MANUS_SINGLETON.destroy();
          }
          if (window.__HY_INTERVALS && Array.isArray(window.__HY_INTERVALS)) {
            window.__HY_INTERVALS.forEach(function(id){ clearInterval(id); clearTimeout(id); });
            window.__HY_INTERVALS = [];
          }
          if (window.__HY_OBSERVERS && Array.isArray(window.__HY_OBSERVERS)) {
            window.__HY_OBSERVERS.forEach(function(obs){ obs.disconnect(); });
            window.__HY_OBSERVERS = [];
          }
          // Clear any orphan intervals
          var highestId = window.setInterval(function(){}, 1000);
          for (var i = 0; i <= highestId; i++) {
            window.clearInterval(i);
          }
          document.querySelectorAll('#__hyperion_overlay_root, #__hyperion_overlay_container, [id^="__hyperion_overlay"], .hy-el, .hy-tp, .hy-overlay-rect, .HYL, .HYS').forEach(function(e){ e.remove(); });
          if (!${keepStyles}) {
            document.querySelectorAll('.hy-st, #__hyperion_overlay_styles').forEach(function(e){ e.remove(); });
          }
          delete window.__HY_MANUS_SINGLETON;
          delete window.__hyData;
          delete window.__HY_GET_OVERLAY;
          delete window.__HY_CLICK_OVERLAY;
          delete window.__HY_OVERLAY_READY;
          delete window.__HY_OVERLAY_CACHE;
          window.__HY_KILL = true;
        } catch(e){}
      })()
    `);
        this.injected = false;
    }
    async ensureClean() {
        await this.kill();
    }
    async getData() {
        if (!this.injected) {
            const check = await this.cxn.evaluate('typeof window.__hyData === "function"');
            if (!check?.value)
                throw new Error('Overlay not injected. Call inject() first.');
        }
        const result = await this.cxn.evaluate('window.__hyData()');
        if (!result?.value)
            throw new Error('Failed to get overlay data');
        return JSON.parse(result.value);
    }
    async getElements() {
        const data = await this.getData();
        return data.elements;
    }
    async findElementByText(text) {
        const elements = await this.getElements();
        const lower = text.toLowerCase();
        return elements.find(e => e.text.toLowerCase().includes(lower)) || null;
    }
    async findElementBySid(sid) {
        const elements = await this.getElements();
        return elements.find(e => e.sid === sid) || null;
    }
    async clickElement(sid, options) {
        const el = await this.findElementBySid(sid);
        if (!el)
            throw new Error(`Element with sid ${sid} not found`);
        const btnMap = { left: 'left', middle: 'middle', right: 'right' };
        const btnFlag = { left: 1, middle: 4, right: 2 };
        const button = btnMap[options?.button || 'left'] || 'left';
        const clickCount = options?.clickCount || 1;
        await this.cxn.call('Input.dispatchMouseEvent', {
            type: 'mousePressed',
            x: el.x,
            y: el.y,
            button,
            clickCount,
            buttons: btnFlag[button],
            modifiers: 0
        });
        await this.cxn.call('Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            x: el.x,
            y: el.y,
            button,
            clickCount,
            buttons: 0,
            modifiers: 0
        });
    }
    async getActiveLayer() {
        return this.detector.detect();
    }
    buildOverlayJS(cfg) {
        const z = cfg.zIndex || 2147483647;
        const interval = cfg.intervalMs || 250;
        return `
(function(){
  // 1. Singleton Guard: Teardown previo atómico
  if (window.__HY_MANUS_SINGLETON && typeof window.__HY_MANUS_SINGLETON.destroy === 'function') {
    try { window.__HY_MANUS_SINGLETON.destroy(); } catch(e){}
  }
  if (window.__HY_SINGLE_TIMER) {
    clearInterval(window.__HY_SINGLE_TIMER);
    window.__HY_SINGLE_TIMER = null;
  }

  // Limpieza total de elementos previos sin innerHTML
  document.querySelectorAll('.hy-el, .hy-st, .hy-rr, #hyperion-manus-root, #__hyperion_overlay_root, style[id*="hyperion"]').forEach(function(e){ e.remove(); });

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
    var selector = 'button, a, input, textarea, select, [role="button"], [role="menuitem"], [role="tab"], [role="link"], [role="switch"], [role="checkbox"], [role="textbox"], [role="listitem"], [role="option"], [role="row"], [data-tab], [data-icon], span[data-icon], [contenteditable="true"], [tabindex]:not([tabindex="-1"])';
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
        var cleanText = rawText.replace(/[\\u200b-\\u200f\\ufeff\\u00ad]/g, '').replace(/\\s+/g, ' ').trim().slice(0, 20);
        if (!cleanText && el.tagName !== 'INPUT' && el.tagName !== 'BUTTON') continue;
        if (!cleanText) cleanText = el.tagName.toLowerCase();

        // Agrupación y deduplicación geométrica de 4px
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

        var item = { el: el, rect: r, text: cleanText, tag: el.tagName };
        seenKeys.set(geoKey, item);
        valid.push(item);
      } catch(e) {}
    }

    return valid;
  }

  var isRendering = false;

  function render() {
    if (window.__HY_KILL || isRendering) return;
    isRendering = true;
    try {
      var root = document.getElementById('hyperion-manus-root');
      if (!root) {
        root = document.createElement('div');
        root.id = 'hyperion-manus-root';
        root.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:${z};overflow:hidden;';
        document.documentElement.appendChild(root);
      }

      // Vaciado seguro compatible con Trusted Types
      while (root.firstChild) {
        root.removeChild(root.firstChild);
      }

      var items = getActiveElements();
      var cachedElements = [];

      // Banner Superior Centrado
      var banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;top:4px;left:50%;transform:translateX(-50%);padding:4px 18px;background:rgba(15,23,42,0.96);border:2px solid #22c55e;border-radius:20px;font:bold 12px monospace;color:#22c55e;white-space:nowrap;box-shadow:0 6px 16px rgba(0,0,0,0.8);z-index:${z};pointer-events:none;';
      banner.innerText = '⚡ CAPA MANUS v3.2 [' + items.length + ' ELEMENTOS ACTIVOS]';
      root.appendChild(banner);

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var r = item.rect;
        var c = PALETTE[i % PALETTE.length];
        var sid = i + 1;

        var box = document.createElement('div');
        box.style.cssText = 'position:fixed;pointer-events:none;box-sizing:border-box;border:2px solid ' + c.border + ';border-radius:3px;z-index:${z};left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;background:' + c.fill + ';';

        var tag = document.createElement('div');
        tag.style.cssText = 'position:absolute;top:0;left:0;font:bold 10.5px/12px monospace;padding:1px 4px;border-bottom-right-radius:3px;text-shadow:0 0 2px #000;white-space:nowrap;z-index:${z};background:' + c.badge + ';color:' + c.text + ';';
        tag.innerText = '[' + sid + '] ' + item.text;

        box.appendChild(tag);
        root.appendChild(box);

        cachedElements.push({
          sid: sid,
          tag: item.tag,
          text: item.text,
          x: Math.round(r.left + r.width / 2),
          y: Math.round(r.top + r.height / 2),
          w: Math.round(r.width),
          h: Math.round(r.height),
          rect: { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }
        });
      }

      window.__HY_OVERLAY_CACHE = cachedElements;
    } catch(e) {
    } finally {
      isRendering = false;
    }
  }

  render();
  var tid = setInterval(render, ${interval});
  window.__HY_SINGLE_TIMER = tid;

  var resizeHandler = function(){ render(); };
  var scrollHandler = function(){ render(); };
  window.addEventListener('resize', resizeHandler, { passive: true });
  window.addEventListener('scroll', scrollHandler, { passive: true, capture: true });

  var observer = new MutationObserver(function(mutations){
    var hasAppMutation = false;
    for (var i = 0; i < mutations.length; i++){
      var t = mutations[i].target;
      if (t && (t.id === 'hyperion-manus-root' || (t.closest && t.closest('#hyperion-manus-root')))) continue;
      hasAppMutation = true;
      break;
    }
    if (hasAppMutation) render();
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'disabled', 'hidden', 'aria-hidden']
    });
  }

  window.__HY_MANUS_SINGLETON = {
    destroy: function(){
      clearInterval(tid);
      window.__HY_SINGLE_TIMER = null;
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('scroll', scrollHandler);
      observer.disconnect();
      var root = document.getElementById('hyperion-manus-root');
      if (root) root.remove();
      delete window.__HY_MANUS_SINGLETON;
    },
    render: render
  };

  window.__hyData = function(){
    try {
      var els = window.__HY_OVERLAY_CACHE || [];
      var dialog = null;
      try {
        var ds = document.querySelectorAll('[role="dialog"]');
        for (var i = 0; i < ds.length; i++){
          var d = ds[i];
          if (d.offsetWidth === 0 || d.offsetHeight === 0) continue;
          var r = d.getBoundingClientRect();
          if (r.width < 80 || r.height < 80) continue;
          dialog = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
          break;
        }
      } catch(e){}
      return JSON.stringify({
        type: dialog ? 'DIALOG' : 'PAGE',
        elements: els.map(function(e){ return { sid: e.sid, tag: e.tag, text: e.text, x: e.x, y: e.y, w: e.w, h: e.h, isPost: false }; }),
        activeDialog: dialog
      });
    } catch(e){
      return JSON.stringify({ type: 'ERROR', elements: [], error: e.message });
    }
  };
})()
    `;
    }
}
exports.OverlayPrimitive = OverlayPrimitive;
//# sourceMappingURL=overlay.js.map