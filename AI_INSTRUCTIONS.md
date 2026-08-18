# AI Instructions for Hyperion Browser

This file tells AI agents how to use Hyperion Browser for web automation tasks.
Follow these patterns when writing automation scripts.

## Connection

```javascript
const { Hyperion } = require('./dist/hyperion');

async function main() {
  var h = new Hyperion({
    mode: 'attach',
    websocketUrl: 'ws://127.0.0.1:9222/devtools/page/TAB_ID',
    stealth: {
      runtimeEnable: false,      // keep OFF to avoid detection
      automationOverride: true,  // navigator.webdriver = false
      focusEmulation: true,      // keep tab alive in background
      zeroJSPatches: true        // no detectable JS patches
    }
  });
  await h.connect();
  // ... do stuff ...
  await h.disconnect();
}
main().catch(e => console.error(e.message));
```

## Hello World Pattern

```javascript
const { Hyperion } = require('./dist/hyperion');
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  var h = new Hyperion({mode:'attach',websocketUrl:WS_URL,stealth:{runtimeEnable:false,automationOverride:true,focusEmulation:true,zeroJSPatches:true}});
  await h.connect();

  var r = await h.eval("document.title");
  console.log(r.value);

  await h.disconnect();
}
main().catch(e => console.error(e.message||e));
```

## Evaluate (Run JS in Browser)

```javascript
var result = await h.eval("JSON.stringify({url:location.href,title:document.title})");
var data = JSON.parse(result.value);
```

## Click by Coordinates

```javascript
await h.click(338, 702);  // x, y
```

## Click by Text (via JS)

```javascript
await h.eval(`(function(){
  var buttons = document.querySelectorAll('button, a[href], [role="button"]');
  for(var b of buttons) {
    if(b.textContent.trim().includes('Siguiente')) {
      var r = b.getBoundingClientRect();
      return JSON.stringify({x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2)});
    }
  }
})()`).then(r => {
  var pos = JSON.parse(r.value);
  await h.click(pos.x, pos.y);
});
```

## Type Text

```javascript
await h.eval(`(function(){
  var el = document.querySelector('textarea, input[type="text"], [contenteditable="true"]');
  el.focus();
  el.value = 'Hello world';
  el.dispatchEvent(new Event('input', {bubbles:true}));
  el.dispatchEvent(new Event('change', {bubbles:true}));
})()`);
```

## Take Screenshot

```javascript
var img = await h.screenshot();                    // viewport
var img = await h.screenshot({fullPage:true});     // full page
var img = await h.screenshot({clip:{x:0,y:0,width:800,height:600}}); // region
```

## Overlay System

### When to inject overlay
When you need to SEE what elements are on the page with their positions and IDs.
Run once at the start of a session. DO NOT re-inject on every script unless cleaning up.

### How to inject
```javascript
// Kill old overlays first
await h.eval(`(function(){
  for(var i=0;i<100000;i++){try{clearInterval(i)}catch(e){}try{clearTimeout(i)}catch(e){}}
  document.querySelectorAll('.hy-el,.hy-st,.hy-tp').forEach(function(e){e.remove()});
  window.__HY_KILL=true;
})()`);

// Then inject fresh overlay (use the full overlay code from instagram-one-overlay.js)
```

### How to query overlay data
```javascript
var r = await h.eval('window.__hyData()');
var data = JSON.parse(r.value);
// data.elements[{sid, tag, text, post}]
```

### Rules for overlay stability
1. **IDs use href for links** → `'L_'+href.replace(...)` (stable)
2. **IDs use 200px grid for non-links** → `Math.round(left/200)` (stable across small shifts)
3. **Always include post links** → `a[href*="/p/"],a[href*="/reel/"]` even with empty text
4. **Resize listener** → `window.addEventListener('resize', render)`
5. **Single interval** → 2000ms, checks `__HY_KILL` flag
6. **No MutationObserver** → it conflicts with old overlays. Use interval + resize only.

### Overlay cleanup between scripts
```javascript
// ALWAYS do this before injecting a new overlay
await h.eval(`(function(){
  for(var i=0;i<100000;i++){try{clearInterval(i)}catch(e){}try{clearTimeout(i)}catch(e){}}
  document.querySelectorAll('.hy-el,.hy-st,.hy-tp').forEach(function(e){e.remove()});
  window.__HY_KILL_ALL=true;
  window.__HY_KILL=true;
})()`);
await sleep(500);
```

## Platform-Specific Patterns

### Instagram

**Upload Reel:**
1. Click "Crear" → "Reel" → select file → 0s/5s/10s trim → "Siguiente"
2. Add caption → "Compartir"
3. Wait for "Se ha compartido tu reel" dialog → click "Listo"

**Delete Reel:**
1. Find post in profile grid → click to open
2. Click 3-dot menu → "Eliminar" → confirm "Eliminar" in dialog
3. Profile navigates back to `/fairdrawapp/`

**Discard Dialog:**
- Text: "¿Descartar publicación?"
- Cancel button: role="button" with text "Cancelar"
- Confirm button: role="button" with text "Descartar"

**Profile Grid:**
- Posts are `<a href="/fairdrawapp/p/...">` or `<a href="/fairdrawapp/reel/...">`
- Newest appears first (left to right, top to bottom)
- Some posts have empty `textContent` → use href ID as fallback label

**Map UI elements:**
```javascript
// After injecting overlay, get element positions
var r = await h.eval('window.__hyData()');
var els = JSON.parse(r.value).elements;
els.forEach(e => console.log('['+e.sid+']', e.tag, e.text, e.post?'⬤':''));
```

### WhatsApp
(Patterns TBD after implementation)

### TikTok
(Patterns TBD after implementation)

### Facebook
(Patterns TBD after implementation)

### Gemini Web
(Patterns TBD after implementation)

## Debug Utilities

```javascript
// List all elements with tag, text, position
await h.eval(`(function(){
  var all = document.querySelectorAll('a[href], button, input, textarea, select, [aria-label], [role="button"], [role="tab"], [role="menuitem"], h1,h2,h3,h4,h5,h6, label');
  return JSON.stringify(Array.from(all).map(function(el){
    var r = el.getBoundingClientRect();
    if(r.width<10||r.height<10)return null;
    return {
      tag: el.tagName,
      text: (el.textContent||'').trim().slice(0,20),
      aria: (el.getAttribute('aria-label')||'').slice(0,20),
      href: (el.getAttribute('href')||'').slice(0,30),
      x: Math.round(r.left+r.width/2),
      y: Math.round(r.top+r.height/2),
      w: Math.round(r.width),
      h: Math.round(r.height)
    };
  }).filter(Boolean));
})()`).then(r => console.log(JSON.parse(r.value)));
```

## Finding Elements by Content

```javascript
// Find element containing text
var r = await h.eval(`(function(){
  var text = 'Siguiente';
  var all = document.querySelectorAll('button, a, span, div, [role="button"]');
  for(var el of all) {
    if(el.offsetWidth===0) continue;
    if(el.textContent.trim() === text || el.textContent.trim().startsWith(text)) {
      var b = el.getBoundingClientRect();
      return JSON.stringify({x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)});
    }
  }
  return 'null';
})()`);
if (r.value !== 'null') await h.click(JSON.parse(r.value).x, JSON.parse(r.value).y);
```

## Key Takeaways from Instagram Work

1. **Overlay must be persistent across scripts** → never kill it unless explicitly re-injecting
2. **Stable IDs are critical** → use href for links, coarse grid (200px) for non-links
3. **Old MutationObservers conflict** → clear ALL timers on re-inject, use interval only
4. **Instagram elements without text** → `a[href*="/p/"]` often has empty textContent
5. **Click by coordinate** → safer than selector-based click for overlapped/dynamic elements
6. **Resize breaks fixed-position overlay** → always add resize listener
7. **Sleep generously** → Instagram UI is async-heavy, 500-2000ms between actions
8. **Never navigate away** → all interaction happens in-place, use dialogs/popups

## File Organization

```
hyperion/
├── src/layers/          Platform-specific UI detectors (TypeScript source)
├── scripts/             Automation scripts by platform
│   ├── instagram/       Instagram scripts
│   ├── whatsapp/        WhatsApp scripts
│   ├── tiktok/          TikTok scripts
│   └── facebook/        Facebook scripts
├── dist/                Compiled output (used by scripts via require)
└── *.js                 Top-level scripts (quick prototypes)
```

## Variable naming convention (scripts)
- `h` → Hyperion instance
- `r` → eval result
- `el` → DOM element
- `b` → bounding rect
- `sid` → stable identifier string
- WS_URL → WebSocket URL constant
