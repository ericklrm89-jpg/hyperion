const http = require('http');

http.get('http://127.0.0.1:9222/json', r => {
  let d = ''; r.on('data', c => d += c); r.on('end', () => {
    const tabs = JSON.parse(d);
    console.log(`\n📋 Total tabs: ${tabs.length}`);
    tabs.forEach((t, i) => {
      console.log(`  [${i+1}] Title: "${t.title}" | Type: "${t.type}" | URL: "${t.url}"`);
    });
  });
});
