import { ConnectionManager } from '../connection'
import { OverlayData, OverlayConfig, OverlayElement } from './types'
import { LayerDetector } from './detector'
import { logger } from '../core/logger'

/**
 * OverlayPrimitive (Capa Manus Singleton)
 * Guarantees STRICTLY ONE SINGLE OVERLAY instance in the browser at all times.
 * Automatically destroys any previous layers before starting.
 */
export class OverlayPrimitive {
  private cxn: ConnectionManager
  private detector: LayerDetector
  private injected = false
  private defaultConfig: OverlayConfig = {
    intervalMs: 250,
    includePostLinks: true,
    gridSize: 200,
    zIndex: 2147483647
  }

  constructor(cxn: ConnectionManager) {
    this.cxn = cxn
    this.detector = new LayerDetector(cxn)
  }

  async inject(config?: OverlayConfig): Promise<void> {
    const cfg = { ...this.defaultConfig, ...config }

    // Atomic pre-cleanup to prevent overlay-on-overlay stacking
    await this.kill(false)

    const js = this.buildOverlayJS(cfg)
    await this.cxn.evaluate(js)

    const check = await this.cxn.evaluate('typeof window.__hyData === "function"')
    if (!check?.value) throw new Error('Overlay injection failed')
    this.injected = true

    logger.info('[Overlay/Manus] Capa Manus multicolor singleton inyectada (0 capas duplicadas)');
  }

  async kill(keepStyles = false): Promise<void> {
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
    `)

    this.injected = false
  }

  async ensureClean(): Promise<void> {
    await this.kill()
  }

  async getData(): Promise<OverlayData> {
    if (!this.injected) {
      const check = await this.cxn.evaluate('typeof window.__hyData === "function"')
      if (!check?.value) throw new Error('Overlay not injected. Call inject() first.')
    }

    const result = await this.cxn.evaluate('window.__hyData()')
    if (!result?.value) throw new Error('Failed to get overlay data')
    return JSON.parse(result.value) as OverlayData
  }

  async getElements(): Promise<OverlayElement[]> {
    const data = await this.getData()
    return data.elements
  }

  async findElementByText(text: string): Promise<OverlayElement | null> {
    const elements = await this.getElements()
    const lower = text.toLowerCase()
    return elements.find(e => e.text.toLowerCase().includes(lower)) || null
  }

  async findElementBySid(sid: number): Promise<OverlayElement | null> {
    const elements = await this.getElements()
    return elements.find(e => e.sid === sid) || null
  }

  async clickElement(sid: number, options?: { button?: string; clickCount?: number }): Promise<void> {
    const el = await this.findElementBySid(sid)
    if (!el) throw new Error(`Element with sid ${sid} not found`)

    const btnMap: Record<string, string> = { left: 'left', middle: 'middle', right: 'right' }
    const btnFlag: Record<string, number> = { left: 1, middle: 4, right: 2 }
    const button = btnMap[options?.button || 'left'] || 'left'
    const clickCount = options?.clickCount || 1

    await this.cxn.call('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: el.x,
      y: el.y,
      button,
      clickCount,
      buttons: btnFlag[button],
      modifiers: 0
    })

    await this.cxn.call('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: el.x,
      y: el.y,
      button,
      clickCount,
      buttons: 0,
      modifiers: 0
    })
  }

  async getActiveLayer(): Promise<{ name: string; dialog: any }> {
    return this.detector.detect()
  }

  private buildOverlayJS(cfg: OverlayConfig): string {
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
    ]
    const colorsStr = colors.map(c => `'${c}'`).join(',')
    const z = cfg.zIndex || 2147483647
    const interval = cfg.intervalMs || 250

    return `
(function(){
  // 1. Teardown any previous singleton to prevent layered stacking
  if (window.__HY_MANUS_SINGLETON && typeof window.__HY_MANUS_SINGLETON.destroy === 'function') {
    try { window.__HY_MANUS_SINGLETON.destroy(); } catch(e){}
  }

  document.querySelectorAll('#__hyperion_overlay_root, #__hyperion_overlay_container, [id^="__hyperion_overlay"], .hy-el, .hy-overlay-rect').forEach(function(e){ e.remove(); });

  if(!document.getElementById('__hyperion_overlay_styles')){
    var s = document.createElement('style');
    s.id = '__hyperion_overlay_styles';
    s.textContent = '#__hyperion_overlay_root{position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:${z};overflow:hidden;}' +
      '.hy-el{position:fixed;pointer-events:none;z-index:${z};overflow:hidden;font:bold 11px/13px monospace;color:#fff;text-shadow:0 0 3px #000;box-sizing:border-box;border:2px solid;border-radius:3px;}' +
      '.hy-badge{position:absolute;top:0;left:0;padding:1px 4px;font-weight:bold;font-size:10px;line-height:12px;border-radius:0 0 3px 0;z-index:2;box-shadow:0 1px 3px rgba(0,0,0,0.6);}' +
      '.hy-badge-banner{position:fixed;top:4px;left:4px;background:rgba(0,0,0,0.9);color:#00ff66;border:1px solid #00ff66;padding:3px 8px;border-radius:4px;font:bold 12px monospace;z-index:${z};pointer-events:none;}';
    document.head.appendChild(s);
  }

  var COLORS = [${colorsStr}];
  var isRendering = false;

  function inViewport(r){
    return r.left < window.innerWidth && r.right > 0 && r.top < window.innerHeight && r.bottom > 0;
  }

  function isInteractive(el){
    if(!el || el.nodeType !== 1) return false;
    var tag = el.tagName;
    if(tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'A') return true;
    if(el.isContentEditable || el.getAttribute('contenteditable') === 'true' || el.getAttribute('role') === 'textbox') return true;
    
    var role = el.getAttribute('role');
    if(role === 'button' || role === 'tab' || role === 'menuitem' || role === 'listitem' || role === 'row' || role === 'gridcell' || role === 'option' || role === 'switch' || role === 'checkbox' || role === 'link') return true;

    if(el.hasAttribute('onclick') || el.hasAttribute('data-icon') || el.hasAttribute('data-tab') || el.hasAttribute('data-testid')) return true;

    if(el.tabIndex >= 0 || el.getAttribute('tabindex') === '-1') {
      var txt = (el.textContent || '').trim();
      if(txt && el.parentElement && el.parentElement.getAttribute('role') === 'grid') return true;
    }

    var style = window.getComputedStyle(el);
    if(style.cursor === 'pointer') return true;

    return false;
  }

  function collect(){
    var elements = [];
    var all = document.querySelectorAll('*');
    var rawList = [];

    // 1. First find top-level semantic rows in list / chat panes
    var chatRows = Array.from(document.querySelectorAll('#pane-side [role="row"], #pane-side [role="listitem"], [role="feed"] [role="article"], [role="dialog"] [role="button"]'));
    var rowElements = new Set();
    for(var cr = 0; cr < chatRows.length; cr++){
      var row = chatRows[cr];
      var rb = row.getBoundingClientRect();
      if(rb.width >= 20 && rb.height >= 20 && inViewport(rb)){
        rawList.push({ el: row, rect: rb, isPriorityRow: true });
        rowElements.add(row);
      }
    }

    for(var i = 0; i < all.length; i++){
      try{
        var el = all[i];
        if(!isInteractive(el)) continue;

        // Skip internal children of prioritized rows unless they are independent buttons/actions
        if(!rowElements.has(el) && el.closest('#pane-side [role="row"]')) {
          if(el.tagName !== 'BUTTON' && el.getAttribute('role') !== 'button') continue;
        }

        // Skip internal svg/path/span if parent is already a button
        if((el.tagName === 'svg' || el.tagName === 'path' || el.tagName === 'SPAN' || el.tagName === 'DIV') && el.closest('button, [role="button"], a[href]')) {
          if(el.tagName !== 'BUTTON' && el.getAttribute('role') !== 'button') continue;
        }

        var b = el.getBoundingClientRect();
        if(b.width < 8 || b.height < 8) continue;
        if(b.width > window.innerWidth * 0.98 && b.height > window.innerHeight * 0.98) continue;
        if(!inViewport(b)) continue;

        rawList.push({ el: el, rect: b });
      }catch(e){}
    }

    var filtered = [];
    for(var j = 0; j < rawList.length; j++){
      var item = rawList[j];
      var el = item.el;
      var b = item.rect;
      
      var isDuplicate = false;
      for(var k = 0; k < filtered.length; k++){
        var existing = filtered[k];
        var eb = existing.rect;
        var diffX = Math.abs(b.left - eb.left);
        var diffY = Math.abs(b.top - eb.top);
        var diffW = Math.abs(b.width - eb.width);
        var diffH = Math.abs(b.height - eb.height);

        // If almost same geometry
        if(diffX < 8 && diffY < 8 && diffW < 16 && diffH < 16){
          isDuplicate = true;
          // Prefer parent row / button with meaningful text
          if(!existing.isPriorityRow && item.isPriorityRow){
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
    for(var m = 0; m < filtered.length; m++){
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
        y: Math.round(b.top + b.height/2),
        domElement: el
      });
    }

    return elements;
  }

  function render(){
    if(window.__HY_KILL || isRendering) return;
    isRendering = true;
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
      banner.textContent = '⚡ CAPA MANUS SINGLETON [' + els.length + ' ELEMENTOS]';
      root.appendChild(banner);

      for(var i = 0; i < els.length; i++){
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

      window.__HY_OVERLAY_CACHE = els;
    }catch(e){
    }finally{
      isRendering = false;
    }
  }

  render();

  var tid = setInterval(render, ${interval});
  
  var resizeHandler = function(){ render(); };
  var scrollHandler = function(){ render(); };
  window.addEventListener('resize', resizeHandler, { passive: true });
  window.addEventListener('scroll', scrollHandler, { passive: true, capture: true });

  var observer = new MutationObserver(function(mutations){
    var hasNonOverlayMutation = false;
    for(var i = 0; i < mutations.length; i++){
      var t = mutations[i].target;
      if(t && (t.id === '__hyperion_overlay_root' || t.classList?.contains('hy-el'))) continue;
      hasNonOverlayMutation = true;
      break;
    }
    if(hasNonOverlayMutation) render();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'disabled', 'hidden', 'aria-hidden']
  });

  // Global Singleton Handle with clean destruction API
  window.__HY_MANUS_SINGLETON = {
    destroy: function(){
      clearInterval(tid);
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('scroll', scrollHandler);
      observer.disconnect();
      var root = document.getElementById('__hyperion_overlay_root');
      if(root) root.remove();
      var style = document.getElementById('__hyperion_overlay_styles');
      if(style) style.remove();
      delete window.__HY_MANUS_SINGLETON;
    },
    render: render
  };

  window.__hyData = function(){
    try{
      var els = window.__HY_OVERLAY_CACHE || collect();
      var dialog = null;
      try{
        var ds = document.querySelectorAll('[role="dialog"]');
        for(var i = 0; i < ds.length; i++){
          var d = ds[i];
          if(d.offsetWidth === 0 || d.offsetHeight === 0) continue;
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
    `
  }
}
