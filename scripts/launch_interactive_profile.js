/**
 * HYPERION INTERACTIVE PROFILE & MULTI-PORT SUPERVISOR
 * True Multi-Instance Parallel Browser Launcher with Dynamic Port Allocation.
 * Supports simultaneous concurrent sessions (e.g. 9001 + 9002) with profile cloning.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec, execSync } = require('child_process');
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

function seedProfileIfNew(sourceUserDataDir, profileDir, targetUserDataDir) {
  try {
    const targetDir = path.join(targetUserDataDir, profileDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      const sourceDir = path.join(sourceUserDataDir, profileDir);
      if (fs.existsSync(sourceDir)) {
        const criticalItems = ['Preferences', 'Secure Preferences', 'Cookies', 'Login Data', 'Web Data', 'Network', 'Local Storage'];
        for (const item of criticalItems) {
          const srcItem = path.join(sourceDir, item);
          const dstItem = path.join(targetDir, item);
          if (fs.existsSync(srcItem)) {
            try {
              fs.cpSync(srcItem, dstItem, { recursive: true, errorOnExist: false });
            } catch (e) {}
          }
        }
      }
    }
  } catch (e) {}
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

  // Ordenar perfiles por tiempo de actividad reciente
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

  // Encontrar el primer perfil disponible
  const availableProfileIdx = profiles.findIndex(p => {
    const isBusy = activeSessions.some(s => 
      s.userDataDir.toLowerCase() === p.userDataDir.toLowerCase() &&
      s.profileDir.toLowerCase() === p.profileDir.toLowerCase()
    );
    return !isBusy;
  });

  const promptDefault = availableProfileIdx >= 0 ? availableProfileIdx + 1 : 1;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));
  
  // 1. ELECCIÓN DEL PERFIL (100% FIEL A TUS PERFILES REALES)
  const profileAnswer = (await question(`👉 Selecciona el perfil [1..${profiles.length}] (Enter para #${promptDefault}): `)).trim();

  let selectedIndex = promptDefault - 1;
  if (profileAnswer && !isNaN(Number(profileAnswer))) {
    const parsed = Number(profileAnswer) - 1;
    if (parsed >= 0 && parsed < profiles.length) {
      selectedIndex = parsed;
    }
  }

  const selected = profiles[selectedIndex];
  
  // 2. SUGERENCIA Y ELECCIÓN MANUAL DEL PUERTO CDP
  const suggestedPort = await PortSessionManager.findNextAvailablePort(9001, 9040);
  console.log(`\n🔌 Puerto CDP sugerido: ${suggestedPort}`);
  const portAnswer = (await question(`👉 Ingresa el Puerto CDP [Enter para ${suggestedPort}]: `)).trim();

  let targetPort = suggestedPort;
  if (portAnswer && !isNaN(Number(portAnswer))) {
    const customPort = Number(portAnswer);
    if (customPort >= 1024 && customPort <= 65535) {
      targetPort = customPort;
    }
  }

  console.log(`\n🚀 Iniciando ${selected.browser} con Perfil "${selected.name}" en Puerto CDP: ${targetPort}...`);
  saveLastProfile(selected);

  // 3. Determinar directorio de datos y gestión de aislamiento multi-instancia
  let effectiveUserDataDir = selected.userDataDir;
  
  if (activeSessions.length > 0) {
    // Es una segunda o tercera instancia en paralelo: aislar directorio para que Chrome permita múltiples procesos concurrentes
    effectiveUserDataDir = PortSessionManager.getIsolatedUserDataDir(selected.browser, selected.profileDir);
    seedProfileIfNew(selected.userDataDir, selected.profileDir, effectiveUserDataDir);
    cleanProfileLocks(effectiveUserDataDir);
  } else {
    // Es la primera instancia activa: limpiar posibles procesos huérfanos antes de iniciar
    try {
      execSync('taskkill /f /im chrome.exe /im msedge.exe /im brave.exe >nul 2>&1', { stdio: 'ignore' });
    } catch (e) {}
    cleanProfileLocks(selected.userDataDir);
  }

  const chromeFlags = [
    `--remote-debugging-port=${targetPort}`,
    `--user-data-dir="${effectiveUserDataDir}"`,
    `--profile-directory="${selected.profileDir}"`,
    '--no-first-run',
    '--restore-last-session',
    '--no-sandbox',
    '--test-type',
    'https://mail.google.com',
    'https://web.whatsapp.com',
    'https://www.instagram.com',
    'https://www.facebook.com'
  ].join(' ');

  const launchCmd = `start "" "${selected.exe}" ${chromeFlags}`;

  exec(launchCmd, { shell: 'cmd.exe' });

  // 4. Registrar sesión activa
  await PortSessionManager.registerSession({
    port: targetPort,
    browser: selected.browser,
    profileDir: selected.profileDir,
    profileName: selected.name,
    userDataDir: selected.userDataDir,
    isolatedDataDir: effectiveUserDataDir,
    pid: process.pid,
    startedAt: new Date().toISOString(),
    wsUrl: `ws://127.0.0.1:${targetPort}`
  });

  // Esperar a que el navegador termine de abrir y responder CDP
  await new Promise(r => setTimeout(r, 2500));
  let initialTabs = await queryCdpTabs(targetPort);

  // DIBUJAR DASHBOARD PERSISTENTE
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

  // Manejo de comandos interactivos en la ventana persistente
  rl.on('line', async (line) => {
    const cmd = line.trim().toLowerCase();
    if (cmd === 'q') {
      await cleanupAndExit();
    } else if (cmd === 'r') {
      const tabs = await queryCdpTabs(targetPort);
      drawPersistentDashboard(selected, targetPort, tabs);
    }
  });

  // Limpieza al recibir SIGINT (Ctrl + C) o cierre de proceso
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
