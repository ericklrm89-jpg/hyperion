const http = require('http');
const WebSocket = require('ws');

http.get('http://localhost:9222/json', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const tabs = JSON.parse(data);
    const t = tabs.find(x => x.type === 'page' && x.url.includes('gemini.google.com') && !x.url.includes('RotateCookiesPage'));
    if (!t) return console.log('Tab no encontrada');

    const ws = new WebSocket(t.webSocketDebuggerUrl);
    ws.on('open', () => {
      console.log('Solicitando árbol DOM completo atravesando Shadow DOM...');
      ws.send(JSON.stringify({ id: 1, method: 'DOM.getDocument', params: { depth: -1, pierce: true } }));
    });

    ws.on('message', async msg => {
      const res = JSON.parse(msg);
      if (res.id === 1 && res.result) {
        console.log('Árbol DOM obtenido exitosamente.');
        
        // Find all input files or button nodes
        function walk(node, list = []) {
          if (node.nodeName === 'INPUT' || node.nodeName === 'BUTTON' || (node.attributes && node.attributes.includes('button'))) {
            list.push({
              nodeId: node.nodeId,
              nodeName: node.nodeName,
              localName: node.localName,
              attributes: node.attributes
            });
          }
          if (node.children) node.children.forEach(c => walk(c, list));
          if (node.shadowRoots) node.shadowRoots.forEach(s => walk(s, list));
          return list;
        }

        const nodes = walk(res.result.root);
        console.log(`Nodos interactivos (INPUT/BUTTON) encontrados en el árbol pierced: ${nodes.length}`);
        console.dir(nodes.slice(0, 20), { depth: null });
        process.exit(0);
      }
    });
  });
});
