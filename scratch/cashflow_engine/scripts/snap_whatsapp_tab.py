import asyncio
import websockets
import json
import base64
import urllib.request
import os

CDP_PORT = 9001
ASSETS_DIR = r"C:\Users\erick\.gemini\antigravity-ide\scratch\cashflow_engine\public\assets"

CAPA_MANUS = """
(function(){
  try {
    if (window.__HY_SINGLE_TIMER) { clearInterval(window.__HY_SINGLE_TIMER); window.__HY_SINGLE_TIMER = null; }
    document.querySelectorAll('.hy-el, .hy-st, .hy-rr').forEach(function(e){ e.remove(); });
  } catch(e){}

  if(!document.querySelector('.hy-st')){
    var s = document.createElement('style');
    s.className = 'hy-st';
    s.textContent = '.hy-rr{position:fixed;pointer-events:none;z-index:2147483647;overflow:hidden;font:bold 11px/13px monospace;color:#fff;text-shadow:0 0 3px #000,0 0 6px #000;padding:1px 3px;box-sizing:border-box;border:2px solid;border-radius:3px;}';
    document.head.appendChild(s);
  }

  var C = [
    {f:'rgba(255,0,0,0.4)', b:'#F00'}, {f:'rgba(0,200,0,0.4)', b:'#0C0'},
    {f:'rgba(0,100,255,0.4)', b:'#06F'}, {f:'rgba(200,200,0,0.4)', b:'#CC0'}
  ];

  function getAllDeepElements(root) {
    root = root || document;
    var selector = 'button, a, input, textarea, select, [role="button"], [role="menuitem"], [role="tab"], [role="link"], [role="switch"], [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
    var els = Array.from(root.querySelectorAll(selector));
    var allNodes = Array.from(root.querySelectorAll('*'));
    for (var i = 0; i < allNodes.length; i++) {
      if (allNodes[i].shadowRoot) { els = els.concat(getAllDeepElements(allNodes[i].shadowRoot)); }
    }
    return els;
  }

  function getActiveLayerData(){
    var w = window.innerWidth, h = window.innerHeight;
    var all = getAllDeepElements(document);
    var vis = [];
    for (var i = 0; i < all.length; i++){
      try {
        var el = all[i];
        if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
        var r = el.getBoundingClientRect();
        if (r.width < 12 || r.height < 12) continue;
        if (r.right < 0 || r.bottom < 0 || r.left > w || r.top > h) continue;
        var cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
        if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
        var at = document.elementsFromPoint(cx, cy);
        if (!at || at.length === 0) continue;
        var top = at[0], onTop = (top === el || el.contains(top));
        if (!onTop) continue;
        var aria2 = el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder') || '';
        var rawText = aria2 || el.textContent || '';
        var text = rawText.replace(/[\\u200b-\\u200f\\ufeff\\u00ad]/g, '').replace(/\\s+/g, ' ').trim().slice(0, 20);
        if (!text) continue;
        vis.push({ el: el, rect: r, text: text });
      } catch(e){}
    }
    return { type: 'CAPA MANUS WHATSAPP', elements: vis };
  }

  function render(){
    try {
      document.querySelectorAll('.hy-rr').forEach(function(e){ e.remove(); });
      var layer = getActiveLayerData();
      var els = layer.elements || [];
      var info = document.createElement('div');
      info.className = 'hy-rr';
      info.style.cssText = 'top:3px;left:50%;transform:translateX(-50%);padding:4px 14px;background:rgba(15,23,42,0.9);border-radius:20px;font:bold 12px monospace;color:#00ff66;border:2px solid #00ff66;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.8);';
      info.textContent = layer.type + ' [' + els.length + ' ELEMENTOS MAPEADOS]';
      document.body.appendChild(info);
      for (var i = 0; i < els.length; i++){
        var e = els[i], r = e.rect, c = C[i % C.length];
        var d = document.createElement('div');
        d.className = 'hy-rr';
        d.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;background:' + c.f + ';border:2px solid ' + c.b + ';';
        d.textContent = '[' + (i + 1) + '] ' + e.text.slice(0, 15);
        document.body.appendChild(d);
      }
    } catch(e){}
  }

  render();
  window.__HY_SINGLE_TIMER = setInterval(render, 250);
})();
"""

async def snap_wa():
    req = urllib.request.urlopen(f"http://127.0.0.1:{CDP_PORT}/json")
    tabs = json.loads(req.read().decode('utf-8'))
    wa_tab = next((t for t in tabs if 'web.whatsapp.com' in t.get('url', '')), None)
    if not wa_tab:
        print("No WA tab")
        return

    print("Conectando a WA tab:", wa_tab['title'])
    async with websockets.connect(wa_tab['webSocketDebuggerUrl'], max_size=50*1024*1024) as ws:
        await ws.send(json.dumps({'id': 1, 'method': 'Runtime.evaluate', 'params': {'expression': CAPA_MANUS}}))
        await ws.recv()
        await asyncio.sleep(1)
        await ws.send(json.dumps({'id': 2, 'method': 'Page.captureScreenshot', 'params': {'format': 'jpeg', 'quality': 95}}))
        res = json.loads(await ws.recv())
        data = res.get('result', {}).get('data')
        if data:
            out = os.path.join(ASSETS_DIR, "live_wa_audited_manus.jpg")
            with open(out, 'wb') as f:
                f.write(base64.b64decode(data))
            print("✅ Captura WhatsApp con Capa Manus guardada:", out)

if __name__ == '__main__':
    asyncio.run(snap_wa())
