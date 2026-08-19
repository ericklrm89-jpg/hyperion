"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverlayPrimitive = void 0;
const detector_1 = require("./detector");
const logger_1 = require("../core/logger");
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
        // Step 1: Cleanly kill any existing overlay without touching web page timers
        await this.kill(true);
        // Step 2: Build and inject the isolated overlay JS
        const js = this.buildOverlayJS(cfg);
        await this.cxn.evaluate(js);
        // Step 3: Verify it's running
        const check = await this.cxn.evaluate('typeof window.__hyData === "function"');
        if (!check?.value)
            throw new Error('Overlay injection failed');
        this.injected = true;
        logger_1.logger.info('[Overlay/Manus] Capa Manus multicolor integral inyectada y activa con bucle dinámico (250ms)');
    }
    async kill(keepStyles = false) {
        await this.cxn.evaluate(`
      (function(){
        try {
          if (window.__HY_INTERVALS && Array.isArray(window.__HY_INTERVALS)) {
            window.__HY_INTERVALS.forEach(function(id){ clearInterval(id); clearTimeout(id); });
            window.__HY_INTERVALS = [];
          }
          if (window.__HY_OBSERVERS && Array.isArray(window.__HY_OBSERVERS)) {
            window.__HY_OBSERVERS.forEach(function(obs){ obs.disconnect(); });
            window.__HY_OBSERVERS = [];
          }
          var root = document.getElementById('__hyperion_overlay_root');
          if (root) root.remove();
          document.querySelectorAll('.hy-el, .hy-tp').forEach(function(e){ e.remove(); });
          if (!${keepStyles}) {
            document.querySelectorAll('.hy-st').forEach(function(e){ e.remove(); });
          }
          window.__HY_KILL = true;
        } catch(e){}
      })()
    `);
        this.injected = false;
    }
    async ensureClean() {
        const check = await this.cxn.evaluate(`
      (function(){
        var hasOverlay = !!document.getElementById('__hyperion_overlay_root') || !!document.querySelector('.hy-el');
        var hasDataFn = typeof window.__hyData === 'function';
        return hasOverlay || hasDataFn;
      })()
    `);
        if (check?.value) {
            await this.kill();
        }
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
        const colors = cfg.colors || [
            '#00ff66', // Neon Emerald
            '#00e5ff', // Cyber Cyan
            '#ff007f', // Neon Magenta
            '#ffea00', // Electric Yellow
            '#d500f9', // Neon Purple
            '#ff6d00', // Neon Orange
            '#2979ff', // Electric Blue
            '#00e676', // Spring Green
            '#ff1744', // Crimson Neon
            '#00b0ff', // Vivid Sky Blue
        ];
        const colorsStr = colors.map(c => `'${c}'`).join(',');
        const z = cfg.zIndex || 2147483647;
        const interval = cfg.intervalMs || 250;
        return `
(function(){
  window.__HY_KILL = false;
  window.__HY_INTERVALS = window.__HY_INTERVALS || [];
  window.__HY_OBSERVERS = window.__HY_OBSERVERS || [];

  if(!document.querySelector('.hy-st')){
    var s=document.createElement('style');s.className='hy-st';
    s.textContent='#__hyperion_overlay_root{position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:${z};overflow:hidden;}' +
      '.hy-el{position:fixed;pointer-events:none;z-index:${z};overflow:hidden;font:bold 11px/13px monospace;color:#fff;text-shadow:0 0 3px #000;box-sizing:border-box;border:2px solid;border-radius:3px;}' +
      '.hy-badge{position:absolute;top:0;left:0;padding:1px 4px;font-weight:bold;font-size:10px;line-height:12px;border-radius:0 0 3px 0;z-index:2;box-shadow:0 1px 3px rgba(0,0,0,0.6);}' +
      '.hy-badge-banner{position:fixed;top:4px;left:4px;background:rgba(0,0,0,0.9);color:#00ff66;border:1px solid #00ff66;padding:3px 8px;border-radius:4px;font:bold 12px monospace;z-index:${z};pointer-events:none;}';
    document.head.appendChild(s);
  }

  var COLORS=[${colorsStr}];

  function inViewport(r){
    return r.left<window.innerWidth && r.right>0 && r.top<window.innerHeight && r.bottom>0;
  }

  function isInteractive(el){
    if(!el || el.id === '__hyperion_overlay_root' || el.classList.contains('hy-el')) return false;
    if(el.offsetWidth===0 || el.offsetHeight===0) return false;
    if(el.tagName==='SVG' || el.tagName==='PATH' || el.tagName==='G') return false;

    var tag = el.tagName;
    if(tag==='BUTTON' || tag==='INPUT' || tag==='TEXTAREA' || tag==='SELECT' || tag==='A') return true;
    if(el.isContentEditable || el.getAttribute('contenteditable')==='true' || el.getAttribute('role')==='textbox') return true;
    
    var role = el.getAttribute('role');
    if(role==='button' || role==='tab' || role==='menuitem' || role==='listitem' || role==='row' || role==='option' || role==='switch' || role==='checkbox' || role==='link') return true;

    if(el.hasAttribute('onclick') || el.hasAttribute('data-icon') || el.hasAttribute('data-tab') || el.hasAttribute('data-testid')) return true;

    var style = window.getComputedStyle(el);
    if(style.cursor === 'pointer') return true;

    return false;
  }

  function collect(){
    var elements = [];
    var all = document.querySelectorAll('*');
    var rawList = [];

    for(var i=0;i<all.length;i++){
      try{
        var el=all[i];
        if(!isInteractive(el)) continue;

        var b=el.getBoundingClientRect();
        if(b.width<10 || b.height<10) continue;
        if(b.width > window.innerWidth * 0.95 && b.height > window.innerHeight * 0.95) continue; // Skip full screen containers
        if(!inViewport(b)) continue;

        rawList.push({ el: el, rect: b });
      }catch(e){}
    }

    // Deduplicate: If an element is nested inside another interactive element and occupies substantially the same area, pick the parent or the one with text/aria-label
    var filtered = [];
    for(var j=0; j<rawList.length; j++){
      var item = rawList[j];
      var el = item.el;
      var b = item.rect;
      
      var isDuplicate = false;
      for(var k=0; k<filtered.length; k++){
        var existing = filtered[k];
        var eb = existing.rect;
        var diffX = Math.abs(b.left - eb.left);
        var diffY = Math.abs(b.top - eb.top);
        var diffW = Math.abs(b.width - eb.width);
        var diffH = Math.abs(b.height - eb.height);

        if(diffX < 5 && diffY < 5 && diffW < 10 && diffH < 10){
          isDuplicate = true;
          // Prefer the element with aria-label or text
          if(!existing.text && (el.getAttribute('aria-label') || el.textContent.trim())){
            filtered[k] = item;
          }
          break;
        }
      }

      if(!isDuplicate){
        filtered.push(item);
      }
    }

    var count = 0;
    for(var m=0; m<filtered.length; m++){
      var f = filtered[m];
      var el = f.el;
      var b = f.rect;
      count++;

      var text = (el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder') || el.getAttribute('data-icon') || el.textContent || '').trim().replace(/\\s+/g,' ').slice(0,25);

      elements.push({
        sid: count,
        rect: { left: Math.round(b.left), top: Math.round(b.top), width: Math.round(b.width), height: Math.round(b.height) },
        tag: el.tagName,
        text: text,
        x: Math.round(b.left + b.width/2),
        y: Math.round(b.top + b.height/2)
      });
    }

    return elements;
  }

  function render(){
    if(window.__HY_KILL) return;
    try{
      var root = document.getElementById('__hyperion_overlay_root');
      if(!root){
        root = document.createElement('div');
        root.id = '__hyperion_overlay_root';
        document.documentElement.appendChild(root);
      }

      root.innerHTML = '';
      var els = collect();

      var banner = document.createElement('div');
      banner.className = 'hy-badge-banner';
      banner.textContent = '⚡ CAPA MANUS MULTICOLOR ACTIVA [' + els.length + ' ELEMENTOS]';
      root.appendChild(banner);

      for(var i=0; i<els.length; i++){
        var e = els[i], b = e.rect, c = COLORS[(e.sid - 1)%COLORS.length];
        var d = document.createElement('div');
        d.className = 'hy-el';
        d.style.cssText = 'left:' + b.left + 'px;top:' + b.top + 'px;width:' + b.width + 'px;height:' + b.height + 'px;background:rgba(0,0,0,0.10);border-color:' + c + ';';

        var badge = document.createElement('div');
        badge.className = 'hy-badge';
        badge.style.cssText = 'background:' + c + ';color:#000;';
        badge.textContent = '[' + e.sid + ']' + (b.width > 70 && e.text ? ' ' + e.text.slice(0, 12) : '');
        d.appendChild(badge);

        root.appendChild(d);
      }
    }catch(e){}
  }

  render();

  var tid = setInterval(function(){
    if(window.__HY_KILL){ clearInterval(tid); return; }
    render();
  }, ${interval});
  window.__HY_INTERVALS.push(tid);

  window.addEventListener('resize', render, { passive: true });
  window.addEventListener('scroll', render, { passive: true });

  window.__hyData = function(){
    try{
      var els = collect();
      var dialog = null;
      try{
        var ds = document.querySelectorAll('[role="dialog"]');
        for(var i=0; i<ds.length; i++){
          var d = ds[i];
          if(d.offsetWidth===0 || d.offsetHeight===0) continue;
          var r = d.getBoundingClientRect();
          if(r.width < 80 || r.height < 80) continue;
          dialog = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
          break;
        }
      }catch(e){}
      return JSON.stringify({
        type: dialog ? 'DIALOG' : 'PAGE',
        elements: els.map(function(e){ return { sid: e.sid, tag: e.tag, text: e.text, x: e.x, y: e.y, w: e.rect.width, h: e.rect.height, isPost: false }; }),
        activeDialog: dialog
      });
    }catch(e){ return JSON.stringify({ type: 'ERROR', elements: [], error: e.message }); }
  };
})()
    `;
    }
}
exports.OverlayPrimitive = OverlayPrimitive;
//# sourceMappingURL=overlay.js.map