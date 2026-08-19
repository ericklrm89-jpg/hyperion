const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/70061E917F97EF9FC2862358A553459A');

ws.on('open', () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const waElements = [];
        const candidates = document.querySelectorAll('*');
        for (const el of candidates) {
          if (el.id === '__hyperion_overlay_root' || el.id === '__hyperion_overlay_container' || el.classList.contains('hy-el') || el.classList.contains('hy-overlay-rect')) continue;
          if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
          
          const style = window.getComputedStyle(el);
          const isClickable = style.cursor === 'pointer' || 
            el.hasAttribute('onclick') || 
            el.getAttribute('role') === 'button' || 
            el.getAttribute('role') === 'textbox' ||
            el.getAttribute('role') === 'tab' ||
            el.getAttribute('role') === 'menuitem' ||
            el.getAttribute('role') === 'listitem' ||
            el.getAttribute('role') === 'row' ||
            el.getAttribute('role') === 'option' ||
            el.hasAttribute('contenteditable') ||
            el.tagName === 'BUTTON' ||
            el.tagName === 'INPUT' ||
            el.tagName === 'TEXTAREA' ||
            el.tagName === 'A' ||
            el.hasAttribute('data-icon') ||
            el.hasAttribute('data-tab') ||
            el.hasAttribute('data-testid') ||
            el.hasAttribute('aria-label') ||
            el.hasAttribute('title');

          if (isClickable) {
            const rect = el.getBoundingClientRect();
            if (rect.width >= 10 && rect.height >= 10 && rect.top >= 0 && rect.top <= window.innerHeight && rect.left >= 0 && rect.left <= window.innerWidth) {
              const label = el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('data-icon') || el.getAttribute('data-testid') || el.textContent.trim().slice(0, 20);
              waElements.push({
                tag: el.tagName,
                role: el.getAttribute('role'),
                label: label.slice(0, 30),
                w: Math.round(rect.width),
                h: Math.round(rect.height),
                cursor: style.cursor
              });
            }
          }
        }
        return { totalCandidates: candidates.length, interactiveCount: waElements.length, sample: waElements.slice(0, 30) };
      })()`,
      returnByValue: true
    }
  }));
});

ws.on('message', (msg) => {
  const data = JSON.parse(msg);
  if (data.id === 1) {
    console.log('Result:', JSON.stringify(data.result.result.value, null, 2));
    ws.close();
    process.exit(0);
  }
});
