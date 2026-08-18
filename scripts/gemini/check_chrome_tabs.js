const http = require('http');

http.get('http://127.0.0.1:9222/json', r => {
  let d = ''; r.on('data', c => d += c);
  r.on('end', () => {
    try {
      const tabs = JSON.parse(d);
      console.log('✅ Conexión CDP establecida.');
      console.log('Pestañas activas detectadas:');
      tabs.forEach((t, i) => {
        console.log(`[Tab ${i + 1}] Tipo: ${t.type} | URL: ${t.url}`);
      });
    } catch(e) {
      console.log('❌ Error al parsear JSON de CDP:', e.message);
    }
  });
}).on('error', e => {
  console.log('❌ Error al conectar a Chrome debug port 9222:', e.message);
});
