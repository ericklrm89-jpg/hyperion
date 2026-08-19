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
        logger_1.logger.info('[Overlay/Manus] Capa Manus multicolor inyectada y activa con bucle dinámico (250ms)');
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
        // Dispatch click via CDP input events
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
      '.hy-el{position:fixed;pointer-events:none;z-index:${z};overflow:hidden;font:bold 11px/13px monospace;color:#fff;text-shadow:0 0 3px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;box-shadow:0 0 4px rgba(0,0,0,0.5);}' +
      '.hy-badge-banner{position:fixed;top:4px;left:4px;background:rgba(0,0,0,0.85);color:#00ff66;border:1px solid #00ff66;padding:3px 8px;border-radius:4px;font:bold 12px monospace;z-index:${z};pointer-events:none;}';
    document.head.appendChild(s);
  }

  var COLORS=[${colorsStr}];

  function inViewport(r){
    return r.left<window.innerWidth && r.right>0 && r.top<window.innerHeight && r.bottom>0;
  }

  function collect(){
    var all=document.querySelectorAll('a[href],button,input,textarea,select,[role="button"],[role="menuitem"],[role="tab"],[role="link"],[role="switch"],[contenteditable="true"],[tabindex]:not([tabindex="-1"]),[onclick]');
    var r=[];
    var count = 0;

    for(var i=0;i<all.length;i++){
      try{
        var el=all[i];
        if(el.id === '__hyperion_overlay_root' || el.classList.contains('hy-el')) continue;
        if(el.offsetWidth===0||el.offsetHeight===0) continue;
        if(el.tagName==='SVG'||el.tagName==='PATH') continue;
        
        var b=el.getBoundingClientRect();
        if(b.width<8||b.height<8) continue;
        if(!inViewport(b)) continue;

        count++;
        var text=(el.textContent||el.getAttribute('aria-label')||el.getAttribute('placeholder')||'').trim().replace(/\\s+/g,' ').slice(0,15);

        r.push({
          sid: count,
          rect:{left:Math.round(b.left),top:Math.round(b.top),width:Math.round(b.width),height:Math.round(b.height)},
          tag:el.tagName,
          text: text,
          x:Math.round(b.left+b.width/2),
          y:Math.round(b.top+b.height/2)
        });
      }catch(e){}
    }
    return r;
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
      var els=collect();

      var banner = document.createElement('div');
      banner.className = 'hy-badge-banner';
      banner.textContent = '⚡ CAPA MANUS MULTICOLOR ACTIVA [' + els.length + ' ELEMENTOS]';
      root.appendChild(banner);

      for(var i=0;i<els.length;i++){
        var e=els[i],b=e.rect,c=COLORS[(e.sid - 1)%COLORS.length];
        var d=document.createElement('div');
        d.className='hy-el';
        d.style.cssText='left:'+b.left+'px;top:'+b.top+'px;width:'+b.width+'px;height:'+b.height+'px;background:rgba(0,0,0,0.12);border-color:'+c+';color:'+c+';';
        d.textContent='['+e.sid+']'+(b.width>50 && e.text ? ' '+e.text : '');
        root.appendChild(d);
      }
    }catch(e){}
  }

  render();

  var tid=setInterval(function(){
    if(window.__HY_KILL){clearInterval(tid);return}
    render();
  }, ${interval});
  window.__HY_INTERVALS.push(tid);

  window.addEventListener('resize', render, { passive: true });
  window.addEventListener('scroll', render, { passive: true });

  window.__hyData=function(){
    try{
      var els=collect();
      var dialog=null;
      try{
        var ds=document.querySelectorAll('[role="dialog"]');
        for(var i=0;i<ds.length;i++){
          var d=ds[i];
          if(d.offsetWidth===0||d.offsetHeight===0)continue;
          var r=d.getBoundingClientRect();
          if(r.width<80||r.height<80)continue;
          dialog={x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};
          break;
        }
      }catch(e){}
      return JSON.stringify({
        type:dialog?'DIALOG':'PAGE',
        elements:els.map(function(e){return{sid:e.sid,tag:e.tag,text:e.text,x:e.x,y:e.y,w:e.rect.width,h:e.rect.height,isPost:false}}),
        activeDialog:dialog
      });
    }catch(e){return JSON.stringify({type:'ERROR',elements:[],error:e.message})}
  };
})()
    `;
    }
}
exports.OverlayPrimitive = OverlayPrimitive;
//# sourceMappingURL=overlay.js.map