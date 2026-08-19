const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const userDataDir = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');
const port = 9001;

console.log(`[Hyperion] Preparando Chrome en Puerto CDP ${port}...`);

// 1. Cerrar procesos residuales de Chrome
try {
  execSync('taskkill /f /im chrome.exe >nul 2>&1', { stdio: 'ignore' });
} catch (e) {}

// 2. Limpiar locks
const locks = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'];
for (const lock of locks) {
  const p = path.join(userDataDir, lock);
  try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {}
}

// 3. Iniciar Chrome con el puerto 9001 y el perfil real Default
const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const args = [
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  `--profile-directory=Default`,
  '--no-first-run',
  '--restore-last-session',
  'https://mail.google.com',
  'https://web.whatsapp.com'
];

const child = spawn(chromeExe, args, { detached: true, stdio: 'ignore' });
child.unref();

console.log(`[Hyperion] Chrome iniciado en http://127.0.0.1:${port}`);
