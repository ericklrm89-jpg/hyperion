/**
 * HYPERION INTERACTIVE PROFILE & CUSTOM PORT SELECTOR
 * Flexible Profile and Port selection with real-time live tab supervisor.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const { spawn, execSync } = require('child_process');
const readline = require('readline');
const { ProfileScanner } = require('../dist/connection/resilience/ProfileScanner');
const { PortSessionManager } = require('../dist/connection/resilience/PortSessionManager');

const LAST_PROFILE_FILE = path.join(__dirname, '..', '.last_profile.json');

function loadLastProfile() {
  try {
    if (fs.existsSync(LAST_PROFILE_FILE)) {
      return JSON.parse(fs.readFileSync(LAST_PROFILE_FILE, 'utf8'));
    }
  } catch (e) {}
  return null;
}

function saveLastProfile(profile) {
  try {
    fs.writeFileSync(LAST_PROFILE_FILE, JSON.stringify(profile, null, 2));
  } catch (e) {}
}

function cleanProfileLocks(dir) {
  const locks = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'];
  for (const lock of locks) {
    const fullPath = path.join(dir, lock);
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (e) {}
  }
}

function checkTcpPort(port) {
  return new Promise((resolve) => {
    const s = net.createConnection({ host: '127.0.0.1', port }, () => {
      s.destroy();
      resolve(true);
    });
    s.on('error', () => resolve(false));
    s.setTimeout(250, () => { s.destroy(); resolve(false); });
  });
}

function queryCdpTabs(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/json/list`, { timeout: 1500 }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const list = JSON.parse(d).filter(x => x.type === 'page');
          resolve(list);
        } catch {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.on('timeout', () => { req.destroy(); resolve([]); });
  });
}

function drawPersistentDashboard(selected, port, tabs = []) {
  console.clear();
  console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║               ⚡ HYPERION CDP SUPERVISOR — SESIÓN DE NAVEGADOR ACTIVA             ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                                   ║');
  console.log(`║   👉 PUERTO CDP PARA OTRAS IAs  : \x1b[1;32m${port}\x1b[0m                                             ║`);
  console.log(`║   👉 URL DE CONEXIÓN LOCAL      : \x1b[1;36mhttp://127.0.0.1:${port}\x1b[0m                                ║`);
  console.log(`║   👉 WEBSOCKET DEBUGGER URL     : \x1b[1;33mws://127.0.0.1:${port}\x1b[0m                                  ║`);
  console.log('║                                                                                   ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║   • Navegador Activo   : ${selected.browser.padEnd(56)} ║`);
  console.log(`║   • Perfil en Uso      : ${(selected.name + ' (' + (selected.userName || selected.profileDir) + ')').padEnd(56)} ║`);
  console.log(`║   • Directorio Perfil  : ${selected.profileDir.padEnd(56)} ║`);
  console.log(`║   • Pestañas Abiertas  : ${tabs.length.toString().padEnd(56)} ║`);
  console.log('╠═══════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║   📋 PESTAÑAS DETECTADAS EN VIVO:                                                 ║');
  
  if (tabs.length === 0) {
    console.log('║      (Conectando con navegador... esperando páginas)                              ║');
  } else {
    tabs.slice(0, 6).forEach((t, i) => {
      const title = (t.title || t.url || 'Sin título').slice(0, 70);
      console.log(`║      [${i + 1}] ${title.padEnd(73)} ║`);
    });
    if (tabs.length > 6) {
      console.log(`║      ... y ${tabs.length - 6} pestañas más                                                    ║`);
    }
  }

  console.log('╠═══════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║   ℹ️  ESTA VENTANA ES PERSISTENTE. MANTENLA ABIERTA PARA QUE LAS IAs CONTROLEN    ║');
  console.log('║       EL NAVEGADOR.                                                               ║');
  console.log('║                                                                                   ║');
  console.log('║   [q + Enter] Salir y liberar puerto | [r + Enter] Refrescar | [Ctrl+C] Cerrar     ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');
}

async function main() {
  console.clear();
  console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║        HYPERION BROWSER — GESTOR DE INSTANCIAS Y PERFILES MULTI-PUERTO            ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

  console.log('🔍 Escaneando navegadores, perfiles y puertos CDP activos...\n');
  const profiles = ProfileScanner.scanAllProfiles();
  const activeSessions = await PortSessionManager.getActiveSessions();

  if (profiles.length === 0) {
    console.error('❌ No se encontraron navegadores instalados en este equipo.');
    console.log('\nPresiona Enter para salir...');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('', () => process.exit(1));
    return;
  }

  profiles.sort((a, b) => (b.activeTime || 0) - (a.activeTime || 0));
  const lastProfile = loadLastProfile();

  console.log('┌─────┬─────────────────┬──────────────────────┬────────────────────────────────┬────────────────────────────┐');
  console.log('│  #  │ NAVEGADOR       │ NOMBRE DE PERFIL     │ CUENTA / EMAIL                 │ ESTADO / PUERTO CDP        │');
  console.log('├─────┼─────────────────┼──────────────────────┼────────────────────────────────┼────────────────────────────┤');

  profiles.forEach((p, idx) => {
    const isLast = lastProfile && lastProfile.userDataDir === p.userDataDir && lastProfile.profileDir === p.profileDir;
    const session = activeSessions.find(s => 
      s.userDataDir.toLowerCase() === p.userDataDir.toLowerCase() &&
      s.profileDir.toLowerCase() === p.profileDir.toLowerCase()
    );

    const num = `[${idx + 1}]`.padEnd(5);
    const browser = p.browser.padEnd(15).slice(0, 15);
    const name = (p.name + (isLast ? ' ⭐' : '')).padEnd(20).slice(0, 20);
    const email = (p.userName || '(Sin cuenta)').padEnd(30).slice(0, 30);
    
    let status = '⚪ Disponible'.padEnd(26);
    if (session) {
      status = `🟢 EN USO (Puerto ${session.port})`.padEnd(26);
    }

    console.log(`│ ${num} │ ${browser} │ ${name} │ ${email} │ ${status} │`);
  });
  console.log('└─────┴─────────────────┴──────────────────────┴────────────────────────────────┴────────────────────────────┘\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  // 1. SELECCIÓN DE PERFIL
  const promptDefaultProfile = 1;
  const answerProfile = (await question(`👉 [1/2] Selecciona el perfil [1..${profiles.length}] (Enter para #${promptDefaultProfile}): `)).trim();

  let selectedIndex = promptDefaultProfile - 1;
  if (answerProfile && !isNaN(Number(answerProfile))) {
    const parsed = Number(answerProfile) - 1;
    if (parsed >= 0 && parsed < profiles.length) {
      selectedIndex = parsed;
    }
  }

  const selected = profiles[selectedIndex];

  // 2. SELECCIÓN DE PUERTO CDP
  // Sugerir el siguiente puerto libre automáticamente
  let suggestedPort = 9222;
  try {
    suggestedPort = await PortSessionManager.findNextAvailablePort(9222, 9250);
  } catch (e) {}

  const answerPort = (await question(`👉 [2/2] Ingresa el Puerto CDP deseado (Enter para ${suggestedPort}): `)).trim();
  let targetPort = suggestedPort;
  if (answerPort && !isNaN(Number(answerPort))) {
    targetPort = Number(answerPort);
  }

  const portInUse = await checkTcpPort(targetPort);
  if (portInUse) {
    console.log(`\n⚠️  El puerto ${targetPort} ya está activo. Conectando como supervisor a la sesión existente...`);
  } else {
    console.log(`\n🚀 Iniciando ${selected.browser} con CDP en Puerto ${targetPort}...`);
    saveLastProfile(selected);

    // Limpiar bloqueos de perfil
    cleanProfileLocks(selected.userDataDir);

    // Si es un puerto secundario (diferente a 9222), usar directorio de perfil aislado para permitir proceso paralelo
    let effectiveUserDataDir = selected.userDataDir;
    if (targetPort !== 9222) {
      effectiveUserDataDir = path.join(require('os').homedir(), '.hyperion', 'profiles', `chrome_port_${targetPort}`);
      if (!fs.existsSync(effectiveUserDataDir)) {
        fs.mkdirSync(effectiveUserDataDir, { recursive: true });
      }
    }

    const args = [
      `--remote-debugging-port=${targetPort}`,
      `--user-data-dir=${effectiveUserDataDir}`,
      `--profile-directory=${selected.profileDir}`,
      '--no-first-run',
      '--restore-last-session',
      'https://mail.google.com',
      'https://web.whatsapp.com',
      'https://www.instagram.com',
      'https://www.facebook.com'
    ];

    const child = spawn(selected.exe, args, {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    await PortSessionManager.registerSession({
      port: targetPort,
      browser: selected.browser,
      profileDir: selected.profileDir,
      profileName: selected.name,
      userDataDir: selected.userDataDir,
      isolatedDataDir: effectiveUserDataDir,
      pid: child.pid,
      startedAt: new Date().toISOString(),
      wsUrl: `ws://127.0.0.1:${targetPort}`
    });
  }

  // Esperar a que el navegador levante el endpoint
  await new Promise(r => setTimeout(r, 2000));
  let initialTabs = await queryCdpTabs(targetPort);

  drawPersistentDashboard(selected, targetPort, initialTabs);

  // Monitor continuo cada 3 segundos
  const monitorInterval = setInterval(async () => {
    const tabs = await queryCdpTabs(targetPort);
    drawPersistentDashboard(selected, targetPort, tabs);
  }, 3000);

  const cleanupAndExit = async () => {
    clearInterval(monitorInterval);
    console.log(`\n🛑 Liberando puerto ${targetPort} y cerrando sesión...`);
    await PortSessionManager.releaseSession(targetPort);
    process.exit(0);
  };

  rl.on('line', async (line) => {
    const cmd = line.trim().toLowerCase();
    if (cmd === 'q') {
      await cleanupAndExit();
    } else if (cmd === 'r') {
      const tabs = await queryCdpTabs(targetPort);
      drawPersistentDashboard(selected, targetPort, tabs);
    }
  });

  process.on('SIGINT', cleanupAndExit);
  process.on('SIGTERM', cleanupAndExit);
  process.on('exit', () => {
    try {
      PortSessionManager.releaseSession(targetPort);
    } catch (e) {}
  });
}

main().catch(err => {
  console.error('❌ Error en lanzador interactivo:', err);
  console.log('\nPresiona Enter para cerrar...');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('', () => process.exit(1));
});
