const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const port = 9001;
const profileDir = path.join(process.env.USERPROFILE, '.hyperion', 'profiles', 'Erick_Default');

if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

console.log(`[Hyperion] Lanzando Chrome aislado en Puerto ${port}...`);

const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const args = [
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--restore-last-session',
  'https://mail.google.com',
  'https://web.whatsapp.com'
];

const child = spawn(chromeExe, args, { detached: true, stdio: 'ignore' });
child.unref();

setTimeout(() => {
  http.get(`http://127.0.0.1:${port}/json`, (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => {
      console.log(`✅ EXITO: Puerto ${port} respondiendo con ${JSON.parse(raw).length} pestañas!`);
    });
  }).on('error', (err) => {
    console.error('❌ Error conectando:', err.message);
  });
}, 3000);
