"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayerDetector = void 0;
/**
 * LayerDetector identifies which UI layer is active on the page
 * using elementsFromPoint at key positions.
 *
 * Layers detected:
 * - "dialog"  : modal/popup overlay (role="dialog")
 * - "sidebar" : persistent navigation sidebar (left)
 * - "content" : main content area
 * - "bottom"  : bottom navigation bar (mobile)
 * - "unknown" : could not determine
 */
class LayerDetector {
    cxn;
    constructor(cxn) {
        this.cxn = cxn;
    }
    async detect() {
        const js = `
      (function(){
        var result = { name: 'unknown', dialog: null, layers: [] };

        // 1. Detect active dialog
        var dialogs = document.querySelectorAll('[role="dialog"]');
        for(var i=0;i<dialogs.length;i++){
          var d = dialogs[i];
          if(d.offsetWidth===0||d.offsetHeight===0)continue;
          var r = d.getBoundingClientRect();
          if(r.width<80||r.height<80)continue;
          // Verify it's really the top layer via elementsFromPoint
          var cx = Math.round(r.left + r.width/2);
          var cy = Math.round(r.top + r.height/2);
          try{
            var at = document.elementsFromPoint(cx, cy);
            for(var t=0;t<Math.min(5,at.length);t++){
              var p = at[t];
              while(p && p !== document.body){
                if(p === d){
                  result.dialog = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
                  break;
                }
                p = p.parentElement;
              }
              if(result.dialog)break;
            }
          }catch(e){}
          if(result.dialog)break;
        }

        // 2. Detect layers at key points
        var w = window.innerWidth, h = window.innerHeight;

        // Left sidebar check (common on Instagram, Facebook, LinkedIn desktop)
        if(w > 768){
          try{
            var leftEls = document.elementsFromPoint(50, h/2);
            for(var i=0;i<leftEls.length;i++){
              var tag = leftEls[i].tagName;
              var role = leftEls[i].getAttribute('role')||'';
              var cls = leftEls[i].className||'';
              if(tag==='NAV'||role==='navigation'||String(cls).includes('sidebar')||String(cls).includes('nav')){
                result.layers.push('sidebar');
                break;
              }
            }
          }catch(e){}
        }

        // Bottom bar check (mobile Instagram/TikTok)
        try{
          var bottomEls = document.elementsFromPoint(w/2, h-30);
          for(var i=0;i<bottomEls.length;i++){
            var tag = bottomEls[i].tagName;
            var role = bottomEls[i].getAttribute('role')||'';
            var cls = bottomEls[i].className||'';
            if(String(cls).includes('bottom')||String(cls).includes('tab-bar')||role==='tablist'){
              if(!result.layers.includes('bottom'))result.layers.push('bottom');
              break;
            }
          }
        }catch(e){}

        // Content area check
        try{
          var contentEls = document.elementsFromPoint(w/2, h/2);
          for(var i=0;i<contentEls.length;i++){
            var tag = contentEls[i].tagName;
            var role = contentEls[i].getAttribute('role')||'';
            var cls = contentEls[i].className||'';
            if(tag==='MAIN'||role==='main'||role==='feed'||String(cls).includes('feed')||String(cls).includes('content')){
              if(!result.layers.includes('content'))result.layers.push('content');
              break;
            }
          }
        }catch(e){}

        // Determine name
        if(result.dialog) result.name = 'dialog';
        else if(result.layers.includes('sidebar')) result.name = 'sidebar';
        else if(result.layers.includes('content')) result.name = 'content';
        else result.name = 'unknown';

        return JSON.stringify(result);
      })()
    `;
        const raw = await this.cxn.evaluate(js);
        return raw?.value ? JSON.parse(raw.value) : { name: 'unknown', dialog: null, layers: [] };
    }
    /**
     * Filter elements to only those within the active dialog (if one exists).
     * Falls back to viewport elements if no dialog.
     */
    async filterActiveLayer(elements) {
        const layer = await this.detect();
        if (!layer.dialog)
            return elements; // no dialog, show all
        const d = layer.dialog;
        return elements.filter(el => el.x >= d.x && el.x <= d.x + d.w &&
            el.y >= d.y && el.y <= d.y + d.h);
    }
}
exports.LayerDetector = LayerDetector;
//# sourceMappingURL=detector.js.map