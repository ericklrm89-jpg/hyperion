const http = require('http');
const WebSocket = require('ws');

async function testPort9002() {
  console.log('🔍 Probando conexión CDP en http://127.0.0.1:9002...');

  http.get('http://127.0.0.1:9002/json/version', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      const v = JSON.parse(d);
      console.log('✅ CDP VERSION:', v.Browser);
      console.log('🔗 WS Debugger URL:', v.webSocketDebuggerUrl);

      http.get('http://127.0.0.1:9002/json/list', (res2) => {
        let d2 = '';
        res2.on('data', c => d2 += c);
        res2.on('end', () => {
          const list = JSON.parse(d2).filter(x => x.type === 'page');
          console.log(`\n📋 Pestañas Abiertas detectadas (${list.length}):`);
          list.forEach((t, i) => {
            console.log(`  [${i + 1}] ${t.title}`);
            console.log(`      URL: ${t.url}`);
            console.log(`      WS:  ${t.webSocketDebuggerUrl}\n`);
          });

          if (list.length > 0) {
            const firstTab = list[0];
            if (firstTab.webSocketDebuggerUrl) {
              console.log(`⚡ Probando evaluación DOM en primera pestaña (${firstTab.title})...`);
              const ws = new WebSocket(firstTab.webSocketDebuggerUrl);
              ws.on('open', () => {
                ws.send(JSON.stringify({
                  id: 1,
                  method: 'Runtime.evaluate',
                  params: { expression: '({ title: document.title, url: window.location.href, readyState: document.readyState })', returnByValue: true }
                }));
              });

              ws.on('message', (msg) => {
                const parsed = JSON.parse(msg.toString());
                if (parsed.id === 1) {
                  console.log('🎯 Resultado Runtime.evaluate:', parsed.result?.result?.value);
                  ws.close();
                  console.log('\n🌟 ¡TEST EXITOSO! El puerto 9002 está 100% operativo y respondiendo a la IA.');
                  process.exit(0);
                }
              });

              ws.on('error', (e) => {
                console.error('Error en WebSocket:', e.message);
                process.exit(1);
              });
            }
          }
        });
      });
    });
  }).on('error', (e) => {
    console.error('❌ Error conectando al puerto 9002:', e.message);
    process.exit(1);
  });
}

testPort9002();
