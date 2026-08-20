/**
 * HYPERION INTERACTIVE PROFILE & MULTI-PORT SUPERVISOR (V2.5)
 * True Multi-Instance Parallel Browser Launcher with Dynamic Port Allocation.
 * Features:
 *  - Auto-detection & Live Tab Monitoring
 *  - [s] Instant Relaunch / Re-open browser if closed
 *  - [n] Open new URL / Fast Shortcut (WhatsApp, Gmail, Instagram, Facebook, Gemini)
 *  - [k] Kill / Stop browser instance
 *  - [l] Clean profile locks
 *  - [p] List all active CDP ports & sessions
 *  - [r] Force refresh tabs
 *  - [q] Exit & release port
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

function queryCdpState(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/json/list`, { timeout: 1200 }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const list = JSON.parse(d).filter(x => x.type === 'page');
          resolve({ connected: true, tabs: list });
        } catch {
          resolve({ connected: true, tabs: [] });
        }
      });
    });
    req.on('error', () => resolve({ connected: false, tabs: [] }));
    req.on('timeout', () => { req.destroy(); resolve({ connected: false, tabs: [] }); });
  });
}

function openCdpTab(port, url) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { timeout: 2000 }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(true));
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function launchBrowserProcess(selected, targetPort, effectiveUserDataDir) {
  cleanProfileLocks(effectiveUserDataDir);

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
}

function drawPersistentDashboard(selected, port, cdpState, customStatus = '') {
  console.clear();
  const isOnline = cdpState.connected;
  const statusBadge = isOnline ? '\x1b[1;42;37m 🟢 EN VIVO / CONECTADO \x1b[0m' : '\x1b[1;41;37m 🔴 NAVEGADOR CERRADO / DESCONECTADO \x1b[0m';

  console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║               ⚡ HYPERION CDP SUPERVISOR — SESIÓN DE NAVEGADOR ACTIVA             ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║   ESTADO DE SESIÓN          : ${statusBadge.padEnd(58)} ║`);
  console.log(`║   👉 PUERTO CDP PARA OTRAS IAs : \x1b[1;32m${port.toString().padEnd(6)}\x1b[0m                                          ║`);
  console.log(`║   👉 URL DE CONEXIÓN LOCAL     : \x1b[1;36mhttp://127.0.0.1:${port}\x1b[0m                                ║`);
  console.log(`║   👉 WEBSOCKET DEBUGGER URL    : \x1b[1;33mws://127.0.0.1:${port}\x1b[0m                                  ║`);
  console.log('╠═══════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║   • Navegador          : ${selected.browser.padEnd(56)} ║`);
  console.log(`║   • Perfil Activo      : ${(selected.name + ' (' + (selected.userName || selected.profileDir) + ')').padEnd(56)} ║`);
  console.log(`║   • Carpeta Perfil     : ${selected.profileDir.padEnd(56)} ║`);
  console.log(`║   • Pestañas Abiertas  : ${cdpState.tabs.length.toString().padEnd(56)} ║`);
  console.log('╠═══════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║   📋 PESTAÑAS DETECTADAS EN TIEMPO REAL:                                          ║');
  
  if (!isOnline) {
    console.log('║      ⚠️  EL NAVEGADOR ESTÁ CERRADO. Presiona [s + Enter] para volver a abrirlo.   ║');
  } else if (cdpState.tabs.length === 0) {
    console.log('║      (Conectando con navegador... esperando páginas)                              ║');
  } else {
    cdpState.tabs.slice(0, 6).forEach((t, i) => {
      const title = (t.title || t.url || 'Sin título').slice(0, 70);
      console.log(`║      [${i + 1}] ${title.padEnd(73)} ║`);
    });
    if (cdpState.tabs.length > 6) {
      console.log(`║      ... y ${cdpState.tabs.length - 6} pestañas más                                                    ║`);
    }
  }

  if (customStatus) {
    console.log('╠═══════════════════════════════════════════════════════════════════════════════════╣');
    console.log(`║   ℹ️  ${customStatus.padEnd(75)} ║`);
  }

  console.log('╠═══════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║   🛠️  COMANDOS DISPONIBLES EN ESTA CONSOLA:                                        ║');
  console.log('║   [s + Enter] 🔄 Reabrir / Relanzar Navegador (mismo perfil y puerto)             ║');
  console.log('║   [n + Enter] 🌐 Abrir nueva pestaña / acceso rápido                              ║');
  console.log('║   [k + Enter] 🛑 Cerrar navegador forzosamente                                    ║');
  console.log('║   [p + Enter] 🔌 Ver todas las sesiones y puertos activos en el sistema           ║');
  console.log('║   [l + Enter] 🧹 Limpiar bloqueos (locks) de perfil                               ║');
  console.log('║   [r + Enter] ⚡ Refrescar estado y pestañas en vivo                              ║');
  console.log('║   [q + Enter] 🚪 Salir del supervisor y liberar puerto                            ║');
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
  
  // 1. ELECCIÓN DEL PERFIL
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

  // 3. Determinar directorio de datos
  let effectiveUserDataDir = selected.userDataDir;
  
  if (activeSessions.length > 0) {
    effectiveUserDataDir = PortSessionManager.getIsolatedUserDataDir(selected.browser, selected.profileDir);
    seedProfileIfNew(selected.userDataDir, selected.profileDir, effectiveUserDataDir);
  } else {
    try {
      execSync('taskkill /f /im chrome.exe /im msedge.exe /im brave.exe >nul 2>&1', { stdio: 'ignore' });
    } catch (e) {}
  }

  // 4. Lanzar proceso inicial
  launchBrowserProcess(selected, targetPort, effectiveUserDataDir);

  // 5. Registrar sesión activa
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
  let currentState = await queryCdpState(targetPort);

  let bannerMessage = 'Sesión iniciada con éxito.';
  drawPersistentDashboard(selected, targetPort, currentState, bannerMessage);

  // Monitor continuo cada 3 segundos
  let isPrompting = false;
  const monitorInterval = setInterval(async () => {
    if (!isPrompting) {
      currentState = await queryCdpState(targetPort);
      drawPersistentDashboard(selected, targetPort, currentState, bannerMessage);
      bannerMessage = '';
    }
  }, 3000);

  const cleanupAndExit = async () => {
    clearInterval(monitorInterval);
    console.log(`\n🛑 Liberando puerto ${targetPort} y cerrando sesión...`);
    await PortSessionManager.releaseSession(targetPort);
    process.exit(0);
  };

  // Manejo de comandos interactivos enriquecidos
  rl.on('line', async (line) => {
    const cmd = line.trim().toLowerCase();
    
    if (cmd === 'q') {
      await cleanupAndExit();
    } else if (cmd === 's') {
      bannerMessage = `🔄 Relanzando ${selected.browser} en puerto ${targetPort}...`;
      launchBrowserProcess(selected, targetPort, effectiveUserDataDir);
      await new Promise(r => setTimeout(r, 2500));
      currentState = await queryCdpState(targetPort);
      bannerMessage = currentState.connected ? '✅ Navegador relanzado y reconectado con éxito.' : '⚠️ Navegador iniciado, esperando respuesta...';
      drawPersistentDashboard(selected, targetPort, currentState, bannerMessage);
    } else if (cmd === 'k') {
      bannerMessage = `🛑 Cerrando procesos de Chrome en este equipo...`;
      try {
        execSync('taskkill /f /im chrome.exe >nul 2>&1', { stdio: 'ignore' });
        bannerMessage = 'Navegador cerrado forzosamente. Presiona [s + Enter] para volver a abrirlo.';
      } catch (e) {
        bannerMessage = 'No se encontraron procesos activos para cerrar.';
      }
      currentState = await queryCdpState(targetPort);
      drawPersistentDashboard(selected, targetPort, currentState, bannerMessage);
    } else if (cmd === 'l') {
      cleanProfileLocks(effectiveUserDataDir);
      cleanProfileLocks(selected.userDataDir);
      bannerMessage = '🧹 Bloqueos de perfil (SingletonLock) eliminados correctamente.';
      drawPersistentDashboard(selected, targetPort, currentState, bannerMessage);
    } else if (cmd === 'p') {
      const allSessions = await PortSessionManager.getActiveSessions();
      console.log('\n┌────────────────────────────────────────────────────────────────────────────────────────┐');
      console.log('│  PUERTOS Y SESIONES CDP ACTIVAS EN HYPERION                                            │');
      console.log('├─────────┬──────────────────────┬──────────────────────┬────────────────────────────────┤');
      console.log('│ PUERTO  │ NAVEGADOR            │ PERFIL               │ WEBSOCKET URL                  │');
      console.log('├─────────┼──────────────────────┼──────────────────────┼────────────────────────────────┤');
      if (allSessions.length === 0) {
        console.log('│ (No hay sesiones registradas actualmente)                                              │');
      } else {
        allSessions.forEach(s => {
          console.log(`│ ${s.port.toString().padEnd(7)} │ ${s.browser.padEnd(20).slice(0, 20)} │ ${s.profileName.padEnd(20).slice(0, 20)} │ ${(s.wsUrl || '').padEnd(30).slice(0, 30)} │`);
        });
      }
      console.log('└─────────┴──────────────────────┴──────────────────────┴────────────────────────────────┘');
      console.log('\nPresiona [r + Enter] para volver al panel...');
    } else if (cmd === 'n') {
      isPrompting = true;
      console.log('\n🌐 ABRIR NUEVA PESTAÑA / ACCESO RÁPIDO:');
      console.log('   [1] WhatsApp Web  (https://web.whatsapp.com)');
      console.log('   [2] Gmail          (https://mail.google.com)');
      console.log('   [3] Instagram      (https://www.instagram.com)');
      console.log('   [4] Facebook       (https://www.facebook.com)');
      console.log('   [5] Google Gemini  (https://gemini.google.com)');
      console.log('   O escribe cualquier URL directa (ej. https://ejemplo.com):');
      
      const dest = (await question('👉 Elige opción o ingresa URL: ')).trim();
      let targetUrl = dest;
      if (dest === '1') targetUrl = 'https://web.whatsapp.com';
      else if (dest === '2') targetUrl = 'https://mail.google.com';
      else if (dest === '3') targetUrl = 'https://www.instagram.com';
      else if (dest === '4') targetUrl = 'https://www.facebook.com';
      else if (dest === '5') targetUrl = 'https://gemini.google.com';
      
      if (targetUrl) {
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          targetUrl = 'https://' + targetUrl;
        }
        await openCdpTab(targetPort, targetUrl);
        bannerMessage = `Pestaña abierta: ${targetUrl}`;
      }
      isPrompting = false;
      currentState = await queryCdpState(targetPort);
      drawPersistentDashboard(selected, targetPort, currentState, bannerMessage);
    } else if (cmd === 'r') {
      currentState = await queryCdpState(targetPort);
      bannerMessage = 'Panel refrescado manualmente.';
      drawPersistentDashboard(selected, targetPort, currentState, bannerMessage);
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
