"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverlayPrimitive = void 0;
const detector_1 = require("./detector");
class OverlayPrimitive {
    constructor(cxn) {
        this.injected = false;
        this.defaultConfig = {
            intervalMs: 2000,
            includePostLinks: true,
            gridSize: 200,
            zIndex: 2147483647
        };
        this.cxn = cxn;
        this.detector = new detector_1.LayerDetector(cxn);
    }
    async inject(config) {
        const cfg = { ...this.defaultConfig, ...config };
        // Step 1: Kill any existing overlay processes
        await this.kill(true);
        // Step 2: Build the overlay JS
        const js = this.buildOverlayJS(cfg);
        await this.cxn.evaluate(js);
        // Step 3: Verify it's running
        const check = await this.cxn.evaluate('typeof window.__hyData === "function"');
        if (!check?.value)
            throw new Error('Overlay injection failed');
        this.injected = true;
    }
    async kill(keepStyles = false) {
        const rmSelector = keepStyles ? '.hy-el,.hy-tp' : '.hy-el,.hy-st,.hy-tp';
        await this.cxn.evaluate(`
      (function(){
        try{
          for(var i=0;i<100000;i++){try{clearInterval(i)}catch(e){}try{clearTimeout(i)}catch(e){}}
          document.querySelectorAll('${rmSelector}').forEach(function(e){e.remove()});
          window.__HY_KILL_ALL=true;
          window.__HY_KILL=true;
        }catch(e){}
      })()
    `);
        this.injected = false;
    }
    async ensureClean() {
        // Check if overlay is running, kill if so
        const check = await this.cxn.evaluate(`
      (function(){
        var hasOverlay = !!document.querySelector('.hy-el');
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
        const button = options?.button || 'left';
        const clickCount = options?.clickCount || 1;
        const delay = 50;
        await this.cxn.dispatchMouseEvent({
            type: 'mousePressed',
            x: el.x, y: el.y,
            button: btnMap[button],
            buttons: btnFlag[button],
            clickCount,
            modifiers: 0
        });
        if (delay > 0)
            await new Promise(r => setTimeout(r, delay));
        await this.cxn.dispatchMouseEvent({
            type: 'mouseReleased',
            x: el.x, y: el.y,
            button: btnMap[button],
            buttons: 0,
            clickCount,
            modifiers: 0
        });
    }
    async getActiveLayer() {
        return this.detector.detect();
    }
    buildOverlayJS(cfg) {
        const colors = cfg.colors || ['#F00', '#0C0', '#06F', '#CC0', '#C0C', '#0CC', '#F80', '#80F'];
        const colorsStr = colors.map(c => `'${c}'`).join(',');
        const grid = cfg.gridSize || 200;
        const z = cfg.zIndex || 2147483647;
        const interval = cfg.intervalMs || 2000;
        return `
(function(){
  window.__HY_KILL_ALL=false;
  window.__HY_KILL=false;

  if(!document.querySelector('.hy-st')){
    var s=document.createElement('style');s.className='hy-st';
    s.textContent='.hy-el{position:fixed;pointer-events:none;z-index:${z};overflow:hidden;font:bold 11px/13px monospace;color:#fff;text-shadow:0 0 3px #000;padding:1px 2px;box-sizing:border-box;border:2px solid;border-radius:2px}';
    document.head.appendChild(s);
  }

  var COLORS=[${colorsStr}];

  function stableId(el){
    var href=el.getAttribute('href')||'';
    var aria=(el.getAttribute('aria-label')||'').replace(/[^a-z0-9_]/gi,'').slice(0,6);
    var text=(el.textContent||'').trim().replace(/\\s+/g,' ').replace(/[^a-z0-9_ ]/gi,'').replace(/ /g,'_').slice(0,6).toUpperCase();
    var suffix=(aria||text||el.tagName).slice(0,6);
    if(href)return 'L_'+href.replace(/[^a-zA-Z0-9]/g,'_').slice(-16)+'_'+suffix;
    var r=el.getBoundingClientRect();
    var x=Math.round(r.left/${grid}),y=Math.round(r.top/${grid});
    return el.tagName+'_'+suffix+'_'+x+'_'+y;
  }

  function hashStr(str){
    var h=0;for(var i=0;i<str.length;i++){h=((h<<5)-h)+str.charCodeAt(i);h|=0}
    return Math.abs(h)%100;
  }

  ${cfg.includePostLinks ? `
  function isPostLink(el){
    var h=el.getAttribute('href')||'';
    return h.includes('/p/')||h.includes('/reel/')||h.includes('/photo/')||h.includes('/video/');
  }` : `
  function isPostLink(){return false;}`}

  function inViewport(r){
    return r.left<window.innerWidth && r.right>0 && r.top<window.innerHeight && r.bottom>0;
  }

  function collect(){
    var all=document.querySelectorAll('a[href],button,input,textarea,select,[role="button"],[role="menuitem"],[role="tab"],[role="link"],[role="switch"],[tabindex]:not([tabindex="-1"]),label,h1,h2,h3,h4,h5,h6,[aria-label]');
    var seen=new Set(),r=[];

    for(var i=0;i<all.length;i++){
      try{
        var el=all[i];
        if(el.offsetWidth===0||el.offsetHeight===0)continue;
        if(el.tagName==='SVG'||el.tagName==='PATH'||el.tagName==='USE'||el.tagName==='CIRCLE'||el.tagName==='LINE')continue;
        var b=el.getBoundingClientRect();
        if(b.width<15||b.height<15)continue;

        var post=isPostLink(el);
        if(!post && !inViewport(b))continue;

        var sid=stableId(el);
        if(seen.has(sid))continue;seen.add(sid);

        var text=(el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,10);
        var aria=el.getAttribute('aria-label')||'';
        var label=text||aria||sid.slice(-4);
        if(!label||label.trim()==='')label='['+sid.slice(-4)+']';

        if(post){
          var h=el.getAttribute('href')||'';
          label=text||aria||'['+h.replace(/.*\\/(p|reel|photo|video)\\//,'').replace(/\\/$/,'').slice(0,6)+']';
        }

        r.push({
          sid:hashStr(sid),
          rect:{left:b.left,top:b.top,width:b.width,height:b.height},
          tag:el.tagName,
          text:label.slice(0,10),
          x:Math.round(b.left+b.width/2),
          y:Math.round(b.top+b.height/2)
        });
      }catch(e){}
    }
    return r;
  }

  function render(){
    try{
      document.querySelectorAll('.hy-el').forEach(function(e){e.remove()});
      var els=collect();

      var hdr=document.createElement('div');hdr.className='hy-el';
      hdr.style.cssText='top:1px;left:1px;padding:2px 8px;background:rgba(0,0,0,0.85);border-radius:4px;font:bold 13px/16px monospace;color:#0f0;border-color:#0f0';
      hdr.textContent='['+els.length+']';
      document.body.appendChild(hdr);

      for(var i=0;i<els.length;i++){
        var e=els[i],b=e.rect,c=COLORS[e.sid%COLORS.length];
        var d=document.createElement('div');d.className='hy-el';
        d.style.cssText='left:'+b.left+'px;top:'+b.top+'px;width:'+b.width+'px;height:'+b.height+'px;background:rgba(0,0,0,0.1);border-color:'+c+';font-size:'+Math.min(10,b.height-2)+'px';
        d.textContent='['+e.sid+']'+(b.width>40?' '+e.text:'');
        document.body.appendChild(d);
      }
    }catch(e){}
  }

  render();

  var tid=setInterval(function(){
    if(window.__HY_KILL_ALL||window.__HY_KILL){clearInterval(tid);return}
    render();
  },${interval});

  window.addEventListener('resize',function(){
    if(window.__HY_KILL_ALL||window.__HY_KILL)return;
    render();
  });

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
`.trim();
    }
}
exports.OverlayPrimitive = OverlayPrimitive;
//# sourceMappingURL=overlay.js.map