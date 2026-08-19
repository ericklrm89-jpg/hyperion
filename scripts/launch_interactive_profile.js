/**
 * HYPERION INTERACTIVE PROFILE LAUNCHER
 * Selección manual de perfil + puerto CDP elegido por el usuario.
 * Sin auto-detección de puertos que falla en Admin/UAC.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, execSync } = require('child_process');
const readline = require('readline');
const { ProfileScanner } = require('../dist/connection/resilience/ProfileScanner');

const LAST_PROFILE_FILE = path.join(__dirname, '..', '.last_profile.json');

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadLastProfile() {
  try {
    if (fs.existsSync(LAST_PROFILE_FILE)) return JSON.parse(fs.readFileSync(LAST_PROFILE_FILE, 'utf8'));
  } catch (e) {}
  return null;
}

function saveLastProfile(profile, port) {
  try { fs.writeFileSync(LAST_PROFILE_FILE, JSON.stringify({ ...profile, lastPort: port }, null, 2)); } catch (e) {}
}

function cleanProfileLocks(dir) {
  for (const lock of ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile']) {
    try { fs.unlinkSync(path.join(dir, lock)); } catch (e) {}
  }
}

function queryCdpTabs(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/json/list`, { timeout: 2000 }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d).filter(x => x.type === 'page')); } catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.on('timeout', () => { req.destroy(); resolve([]); });
  });
}

function isPortAlive(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/json/version`, { timeout: 1500 }, () => resolve(true));
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function drawDashboard(selected, port, tabs = []) {
  console.clear();
  const line = '═'.repeat(83);
  const pad = (s, n) => String(s).padEnd(n).slice(0, n);
  console.log(`╔${line}╗`);
  console.log(`║${'  ⚡ HYPERION CDP SUPERVISOR — SESIÓN ACTIVA'.padEnd(83)}║`);
  console.log(`╠${line}╣`);
  console.log(`║  PUERTO CDP : \x1b[1;32m${port}\x1b[0m   →   \x1b[1;36mhttp://127.0.0.1:${port}\x1b[0m   →   \x1b[1;33mws://127.0.0.1:${port}\x1b[0m${''.padEnd(8)}║`);
  console.log(`╠${line}╣`);
  console.log(`║  Navegador  : ${pad(selected.browser, 68)}║`);
  console.log(`║  Perfil     : ${pad(selected.name + ' (' + (selected.userName || selected.profileDir) + ')', 68)}║`);
  console.log(`║  Carpeta    : ${pad(selected.profileDir, 68)}║`);
  console.log(`║  Pestañas   : ${pad(tabs.length, 68)}║`);
  console.log(`╠${line}╣`);
  console.log(`║  PESTAÑAS EN VIVO:${''.padEnd(64)}║`);
  if (tabs.length === 0) {
    console.log(`║    (Conectando con navegador...)${''.padEnd(51)}║`);
  } else {
    tabs.slice(0, 5).forEach((t, i) => {
      console.log(`║    [${i+1}] ${pad((t.title || t.url || 'Sin título'), 74)}║`);
    });
    if (tabs.length > 5) console.log(`║    ... y ${tabs.length - 5} pestañas más${''.padEnd(55)}║`);
  }
  console.log(`╠${line}╣`);
  console.log(`║  [q + Enter] Salir   [r + Enter] Refrescar   [Ctrl+C] Cerrar${''.padEnd(21)}║`);
  console.log(`╚${line}╝`);
  console.log('');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.clear();

  // 1. Scan profiles
  const profiles = ProfileScanner.scanAllProfiles();
  if (profiles.length === 0) {
    console.error('❌ No se encontraron navegadores instalados.');
    process.stdin.resume();
    await new Promise(r => process.stdin.once('data', r));
    process.exit(1);
  }
  profiles.sort((a, b) => (b.activeTime || 0) - (a.activeTime || 0));

  const last = loadLastProfile();

  // 2. Show profile table
  console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           HYPERION — SELECTOR DE PERFIL Y PUERTO CDP                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');
  console.log(' #  │ NAVEGADOR       │ PERFIL                │ EMAIL / CUENTA               │ ⭐ ');
  console.log('────┼─────────────────┼───────────────────────┼──────────────────────────────┼────');

  profiles.forEach((p, i) => {
    const isLast = last && last.userDataDir === p.userDataDir && last.profileDir === p.profileDir;
    const n    = String(i + 1).padEnd(3);
    const br   = p.browser.padEnd(15).slice(0, 15);
    const name = p.name.padEnd(21).slice(0, 21);
    const mail = (p.userName || '(Sin cuenta)').padEnd(28).slice(0, 28);
    const star = isLast ? ' ⭐' : '';
    console.log(` ${n} │ ${br} │ ${name} │ ${mail} │${star}`);
  });
  console.log('');

  const defaultProfileIdx = last
    ? Math.max(0, profiles.findIndex(p => p.userDataDir === last.userDataDir && p.profileDir === last.profileDir))
    : 0;
  const defaultPort = last?.lastPort || 9222;

  // 3. Interactive prompts
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(r => rl.question(q, r));

  const profileAnswer = (await ask(`👉 Elige perfil [1-${profiles.length}] (Enter = #${defaultProfileIdx + 1}): `)).trim();
  let selIdx = defaultProfileIdx;
  if (profileAnswer && !isNaN(+profileAnswer)) {
    const p = +profileAnswer - 1;
    if (p >= 0 && p < profiles.length) selIdx = p;
  }
  const selected = profiles[selIdx];

  const portAnswer = (await ask(`👉 Puerto CDP (Enter = ${defaultPort}): `)).trim();
  let targetPort = defaultPort;
  if (portAnswer && !isNaN(+portAnswer) && +portAnswer > 1024 && +portAnswer < 65535) {
    targetPort = +portAnswer;
  }

  console.log(`\n✅ Perfil : ${selected.name} (${selected.profileDir})`);
  console.log(`✅ Puerto : ${targetPort}`);

  // 4. Kill orphan Chrome on that port if already alive without CDP
  const alreadyAlive = await isPortAlive(targetPort);
  if (!alreadyAlive) {
    // Kill any non-debug Chrome to avoid port hijacking
    try { execSync('taskkill /f /im chrome.exe /im msedge.exe /im brave.exe >nul 2>&1', { stdio: 'ignore' }); } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
  }

  // 5. Clean profile locks
  cleanProfileLocks(selected.userDataDir);

  // 6. Use isolated user data dir for ports != 9222
  let effectiveDataDir = selected.userDataDir;
  if (targetPort !== 9222) {
    effectiveDataDir = path.join(
      process.env.USERPROFILE || process.env.HOME,
      '.hyperion', 'profiles',
      `${selected.browser.replace(/\s/g, '_')}_${selected.profileDir}`
    );
    fs.mkdirSync(effectiveDataDir, { recursive: true });
  }

  // 7. Launch Chrome
  console.log(`\n🚀 Iniciando ${selected.browser} → puerto ${targetPort}...`);
  const args = [
    `--remote-debugging-port=${targetPort}`,
    `--user-data-dir=${effectiveDataDir}`,
    `--profile-directory=${selected.profileDir}`,
    '--no-first-run',
    '--restore-last-session',
    '--no-sandbox',
    '--test-type',
  ];

  const child = spawn(selected.exe, args, { detached: true, stdio: 'ignore' });
  child.unref();

  saveLastProfile(selected, targetPort);

  // 8. Wait for CDP port
  let attempts = 0;
  while (attempts < 10) {
    await new Promise(r => setTimeout(r, 800));
    if (await isPortAlive(targetPort)) break;
    process.stdout.write('.');
    attempts++;
  }

  let tabs = await queryCdpTabs(targetPort);
  drawDashboard(selected, targetPort, tabs);

  // 9. Live monitor every 3 seconds
  const interval = setInterval(async () => {
    tabs = await queryCdpTabs(targetPort);
    drawDashboard(selected, targetPort, tabs);
  }, 3000);

  const exit = async () => {
    clearInterval(interval);
    console.log('\n🛑 Sesión finalizada.');
    process.exit(0);
  };

  rl.on('line', async (line) => {
    const cmd = line.trim().toLowerCase();
    if (cmd === 'q') await exit();
    else if (cmd === 'r') { tabs = await queryCdpTabs(targetPort); drawDashboard(selected, targetPort, tabs); }
  });

  process.on('SIGINT', exit);
  process.on('SIGTERM', exit);
}

main().catch(err => {
  console.error('\n❌ Error:', err.message || err);
  console.log('\nPresiona Enter para cerrar...');
  process.stdin.resume();
  process.stdin.once('data', () => process.exit(1));
});
