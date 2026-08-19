/**
 * HYPERION INTERACTIVE PROFILE & MULTI-PORT SESSION MANAGER
 * Prevents profile cross-talk, detects busy ports (9222..9230), and isolates instances per project.
 */
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const readline = require('readline');
const { scanAllProfiles } = require('./profile_scanner');
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

function cleanProfileLocks(userDataDir) {
  const locks = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'];
  for (const lock of locks) {
    const fullPath = path.join(userDataDir, lock);
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (e) {}
  }
}

async function main() {
  console.clear();
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║        HYPERION BROWSER — GESTOR DE INSTANCIAS Y PERFILES MULTI-PUERTO        ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  console.log('🔍 Escaneando navegadores, perfiles y puertos CDP activos (9222..9230)...\n');
  const profiles = scanAllProfiles();
  const activeSessions = await PortSessionManager.getActiveSessions();

  if (profiles.length === 0) {
    console.error('❌ No se encontraron navegadores instalados en este equipo.');
    process.exit(1);
  }

  // Sort profiles by activeTime descending (most recent first)
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

  const defaultIndex = profiles.findIndex(p => 
    lastProfile ? (lastProfile.userDataDir === p.userDataDir && lastProfile.profileDir === p.profileDir) : p.isDefault
  );
  const promptDefault = defaultIndex >= 0 ? defaultIndex + 1 : 1;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));
  const answer = (await question(`👉 Selecciona el perfil a utilizar [1..${profiles.length}] (Enter para #${promptDefault}): `)).trim();

  let selectedIndex = promptDefault - 1;
  if (answer && !isNaN(Number(answer))) {
    const parsed = Number(answer) - 1;
    if (parsed >= 0 && parsed < profiles.length) {
      selectedIndex = parsed;
    }
  }

  const selected = profiles[selectedIndex];
  const activeMatch = activeSessions.find(s => 
    s.userDataDir.toLowerCase() === selected.userDataDir.toLowerCase() &&
    s.profileDir.toLowerCase() === selected.profileDir.toLowerCase()
  );

  let targetPort = 9222;

  if (activeMatch) {
    console.log(`\n⚠️  ATENCIÓN: El perfil "${selected.name}" YA ESTÁ ACTIVO y controlado en el puerto ${activeMatch.port}.`);
    console.log('   [1] Conectar y reutilizar la sesión existente en el puerto ' + activeMatch.port + ' (Recomendado)');
    console.log('   [2] Reiniciar el navegador forzando el cierre de la sesión previa');
    
    const choice = (await question('   Elige opción [1 o 2] (Enter para 1): ')).trim();
    if (choice === '2') {
      console.log('\n[1/3] Cerrando navegador previo para reiniciar perfil...');
      try {
        execSync('taskkill /f /im chrome.exe /im msedge.exe /im brave.exe >nul 2>&1', { stdio: 'ignore' });
      } catch (e) {}
      cleanProfileLocks(selected.userDataDir);
      await PortSessionManager.releaseSession(activeMatch.port);
      targetPort = activeMatch.port;
    } else {
      console.log(`\n✅ Conectado a la instancia existente en http://127.0.0.1:${activeMatch.port}`);
      rl.close();
      await new Promise(r => setTimeout(r, 1500));
      return;
    }
  } else {
    // Determine available port
    targetPort = await PortSessionManager.findNextAvailablePort(9222, 9240);
  }

  rl.close();

  console.log(`\n🚀 Asignando Puerto CDP: ${targetPort} para el perfil "${selected.name}"...`);
  saveLastProfile(selected);

  // 1. Limpiar bloqueos de perfil
  cleanProfileLocks(selected.userDataDir);

  // 2. Iniciar el navegador con CDP en el puerto asignado
  const args = [
    `--remote-debugging-port=${targetPort}`,
    `--user-data-dir=${selected.userDataDir}`,
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

  // 3. Registrar sesión activa
  await PortSessionManager.registerSession({
    port: targetPort,
    browser: selected.browser,
    profileDir: selected.profileDir,
    profileName: selected.name,
    userDataDir: selected.userDataDir,
    pid: child.pid,
    startedAt: new Date().toISOString(),
    wsUrl: `ws://127.0.0.1:${targetPort}`
  });

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log(`║   ✅ NAVEGADOR INICIADO CORRECTAMENTE EN EL PUERTO CDP ${targetPort}                     ║`);
  console.log(`║   • Perfil Activo : ${selected.name.padEnd(56)} ║`);
  console.log(`║   • Cuenta Email  : ${(selected.userName || 'N/A').padEnd(56)} ║`);
  console.log(`║   • Endpoint CDP  : http://127.0.0.1:${targetPort.toString().padEnd(49)} ║`);
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  await new Promise(r => setTimeout(r, 2000));
}

main().catch(err => {
  console.error('❌ Error gestionando perfiles:', err);
  process.exit(1);
});
