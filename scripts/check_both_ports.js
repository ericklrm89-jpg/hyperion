const http = require('http');

function check(port) {
  return new Promise((resolve) => {
    http.get(`http://127.0.0.1:${port}/json/list`, { timeout: 1500 }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const list = JSON.parse(d).filter(x => x.type === 'page');
          resolve({ open: true, tabs: list });
        } catch {
          resolve({ open: true, tabs: [] });
        }
      });
    }).on('error', () => resolve({ open: false, tabs: [] }));
  });
}

async function main() {
  console.log('=== INSPECCIÓN SIMULTÁNEA DE PUERTOS 9001 Y 9002 ===\n');

  const p1 = await check(9001);
  if (p1.open) {
    console.log(`🟢 PUERTO 9001 (ACTIVO - ${p1.tabs.length} pestañas):`);
    p1.tabs.forEach((t, i) => console.log(`   [${i + 1}] ${t.title} │ ${t.url}`));
  } else {
    console.log('⚪ PUERTO 9001: No está abierto todavía.');
  }

  console.log('');

  const p2 = await check(9002);
  if (p2.open) {
    console.log(`🟢 PUERTO 9002 (ACTIVO - ${p2.tabs.length} pestañas):`);
    p2.tabs.forEach((t, i) => console.log(`   [${i + 1}] ${t.title} │ ${t.url}`));
  } else {
    console.log('⚪ PUERTO 9002: No está abierto todavía.');
  }
}

main();
