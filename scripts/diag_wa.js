const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/70061E917F97EF9FC2862358A553459A');

ws.on('open', () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const side = document.querySelector("#pane-side");
        if(!side) return "no pane-side";
        const all = Array.from(side.querySelectorAll("*"));
        return all.filter(e => (e.textContent || "").includes("Goberna")).map(e => ({
          tag: e.tagName,
          role: e.getAttribute("role"),
          tabIndex: e.tabIndex,
          className: typeof e.className === "string" ? e.className : "",
          cursor: window.getComputedStyle(e).cursor,
          hasClick: typeof e.onclick === 'function',
          text: (e.textContent||"").slice(0,30),
          rect: e.getBoundingClientRect()
        }));
      })()`,
      returnByValue: true
    }
  }));
});

ws.on('message', (msg) => {
  const d = JSON.parse(msg);
  if (d.id === 1) {
    console.log('Goberna element chain:', JSON.stringify(d.result?.result?.value, null, 2));
    ws.close();
    process.exit(0);
  }
});
