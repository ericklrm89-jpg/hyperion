const http = require('http');

http.get('http://127.0.0.1:9001/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const tabs = JSON.parse(data).filter(t => t.type === 'page');
    console.log(tabs.map(t => ({ id: t.id, title: t.title, url: t.url })));
  });
});
