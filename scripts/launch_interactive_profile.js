/**
 * HYPERION INTERACTIVE PROFILE & MULTI-PORT MASTER SUPERVISOR (V3.5 DEFINITIVE)
 * Selector interactivo de perfil real, selección flexible de puerto CDP y control en vivo.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const readline = require('readline');
const { exec, execSync } = require('child_process');

const LAST_PROFILE_FILE = path.join(os.homedir(), '.hyperion', 'last_profile.json');
const SESSIONS_FILE = path.join(os.homedir(), '.hyperion', 'active_sessions.json');

// --- 1. ESCÁNER DE PERFILES REALES ---
class ProfileScanner {
  static scanAllProfiles() {
    const profiles = [];
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    const browserDefs = [
      {
        browser: 'Google Chrome',
        userDataDir: path.join(localAppData, 'Google', 'Chrome', 'User Data'),
        possibleExes: [
          path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
          path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
          path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        ]
      },
      {
        browser: 'Microsoft Edge',
        userDataDir: path.join(localAppData, 'Microsoft', 'Edge', 'User Data'),
        possibleExes: [
          path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
          path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        ]
      },
      {
        browser: 'Brave',
        userDataDir: path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data'),
        possibleExes: [
          path.join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
          path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
        ]
      }
    ];

    for (const def of browserDefs) {
      const validExe = def.possibleExes.find(exe => fs.existsSync(exe));
      if (!validExe || !fs.existsSync(def.userDataDir)) continue;

      const localStatePath = path.join(def.userDataDir, 'Local State');
      let profileInfoMap = {};

      if (fs.existsSync(localStatePath)) {
        try {
          const raw = fs.readFileSync(localStatePath, 'utf8');
          const parsed = JSON.parse(raw);
          profileInfoMap = parsed.profile?.info_cache || {};
        } catch (e) {}
      }

      // Check profile directories
      const checkProfileDir = (dirName, isDefault) => {
        const fullDirPath = path.join(def.userDataDir, dirName);
        if (!fs.existsSync(fullDirPath)) return;

        const info = profileInfoMap[dirName] || {};
        let activeScore = (info.active_time || 0) * 1000;

        const checkFiles = ['Preferences', 'History', 'Network', 'Sessions'];
        for (const file of checkFiles) {
          const fp = path.join(fullDirPath, file);
          if (fs.existsSync(fp)) {
            try {
              const mtime = fs.statSync(fp).mtimeMs;
              if (mtime > activeScore) activeScore = mtime;
            } catch (e) {}
          }
        }

        profiles.push({
          browser: def.browser,
          exe: validExe,
          userDataDir: def.userDataDir,
          profileDir: dirName,
          name: info.name || (isDefault ? 'Perfil Predeterminado' : dirName),
          userName: info.user_name || '',
          activeTime: activeScore,
          isDefault
        });
      };

      checkProfileDir('Default', true);

      for (let i = 1; i <= 50; i++) {
        checkProfileDir(`Profile ${i}`, false);
      }
    }

    return profiles.sort((a, b) => (b.activeTime || 0) - (a.activeTime || 0));
  }
}

// --- 2. GESTOR DE SESIONES Y PUERTOS ---
class PortSessionManager {
  static getActiveSessions() {
    try {
      if (!fs.existsSync(SESSIONS_FILE)) return [];
      const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  static saveActiveSessions(sessions) {
    try {
      const dir = path.dirname(SESSIONS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8');
    } catch (e) {}
  }

  static isPortInUse(port) {
    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}/json/version`, { timeout: 800 }, (res) => {
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  static async findNextAvailablePort(startPort = 9001, maxPort = 9050) {
    for (let p = startPort; p <= maxPort; p++) {
      const inUse = await this.isPortInUse(p);
      if (!inUse) return p;
    }
    return startPort;
  }

  static async registerSession(session) {
    const sessions = this.getActiveSessions().filter(s => s.port !== session.port);
    sessions.push(session);
    this.saveActiveSessions(sessions);
  }

  static async releaseSession(port) {
    const sessions = this.getActiveSessions().filter(s => s.port !== port);
    this.saveActiveSessions(sessions);
  }

  static getIsolatedUserDataDir(browser, profileDir) {
    const sanitizedBrowser = browser.replace(/\s+/g, '_').toLowerCase();
    const sanitizedDir = profileDir.replace(/\s+/g, '_');
    return path.join(os.homedir(), '.hyperion', 'profiles', `${sanitizedBrowser}_${sanitizedDir}`);
  }
}

// --- 3. UTILIDADES DE PERSISTENCIA Y BLOQUEOS ---
function saveLastProfile(profile) {
  try {
    const dir = path.dirname(LAST_PROFILE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LAST_PROFILE_FILE, JSON.stringify(profile, null, 2), 'utf8');
  } catch (e) {}
}

function loadLastProfile() {
  try {
    if (!fs.existsSync(LAST_PROFILE_FILE)) return null;
    return JSON.parse(fs.readFileSync(LAST_PROFILE_FILE, 'utf8'));
  } catch (e) {
    return null;
  }
}

function cleanProfileLocks(dir) {
  if (!fs.existsSync(dir)) return;
  const locks = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'];
  for (const lock of locks) {
    const p = path.join(dir, lock);
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (e) {}
  }
}

function seedProfileIfNew(sourceUserDataDir, profileDir, targetUserDataDir) {
  try {
    if (!fs.existsSync(targetUserDataDir)) {
      fs.mkdirSync(targetUserDataDir, { recursive: true });
    }

    // 1. Clona Local State para conservar clave OSCrypt de descifrado de contraseñas y cuentas Google
    const srcLocalState = path.join(sourceUserDataDir, 'Local State');
    const dstLocalState = path.join(targetUserDataDir, 'Local State');
    if (fs.existsSync(srcLocalState) && !fs.existsSync(dstLocalState)) {
      try { fs.copyFileSync(srcLocalState, dstLocalState); } catch (e) {}
    }

    // 2. Clona el perfil específico
    const targetDir = path.join(targetUserDataDir, profileDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      const sourceDir = path.join(sourceUserDataDir, profileDir);
      if (fs.existsSync(sourceDir)) {
        const criticalItems = [
          'Preferences',
          'Secure Preferences',
          'Cookies',
          'Login Data',
          'Web Data',
          'Network',
          'Local Storage',
          'IndexedDB',
          'Session Storage'
        ];
        for (const item of criticalItems) {
          const srcItem = path.join(sourceDir, item);
          const dstItem = path.join(targetDir, item);
          if (fs.existsSync(srcItem)) {
            try {
              if (fs.lstatSync(srcItem).isDirectory()) {
                fs.cpSync(srcItem, dstItem, { recursive: true, errorOnExist: false });
              } else {
                fs.copyFileSync(srcItem, dstItem);
              }
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
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const tabs = parsed.filter(t => t.type === 'page');
          resolve({ alive: true, tabs });
        } catch (e) {
          resolve({ alive: true, tabs: [] });
        }
      });
    });
    req.on('error', () => resolve({ alive: false, tabs: [] }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ alive: false, tabs: [] });
    });
  });
}

function openCdpTab(port, url) {
  return new Promise((resolve) => {
    const encodedUrl = encodeURIComponent(url);
    const req = http.get(`http://127.0.0.1:${port}/json/new?${encodedUrl}`, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(true));
    });
    req.on('error', () => resolve(false));
  });
}

function getTabIcon(url, title) {
  const c = (url + ' ' + title).toLowerCase();
  if (c.includes('whatsapp')) return '💬';
  if (c.includes('mail.google') || c.includes('gmail')) return '✉️ ';
  if (c.includes('instagram')) return '📸';
  if (c.includes('facebook')) return '👥';
  if (c.includes('tiktok')) return '🎵';
  if (c.includes('gemini') || c.includes('claude') || c.includes('chatgpt')) return '🤖';
  if (c.includes('fairdraw')) return '💎';
  return '🌐';
}

// --- 4. RENDERIZADO DEL DASHBOARD PERSISTENTE ---
function drawPersistentDashboard(selected, port, cdpState, bannerMessage = '') {
  // Limpiar pantalla de forma limpia sin duplicar
  process.stdout.write('\x1Bc\x1b[2J\x1b[3J\x1b[H');

  const statusBadge = cdpState.alive 
    ? '\x1b[1;42;37m 🟢 ACTIVO & CONECTADO \x1b[0m'
    : '\x1b[1;41;37m 🔴 OFFLINE / CERRADO \x1b[0m';

  console.log('\x1b[1;36m╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗\x1b[0m');
  console.log(`\x1b[1;36m║\x1b[0m  \x1b[1;35m⚡ HYPERION MASTER CONTROL CENTER V3.5\x1b[0m — \x1b[1mSUPERVISOR DE SESIÓN EN VIVO\x1b[0m                                \x1b[1;36m║\x1b[0m`);
  console.log('\x1b[1;36m╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣\x1b[0m');
  console.log(`\x1b[1;36m║\x1b[0m  \x1b[1mNAVEGADOR:\x1b[0m ${selected.browser.padEnd(16)} │ \x1b[1mPERFIL:\x1b[0m ${selected.name.padEnd(18)} │ \x1b[1mPUERTO CDP:\x1b[0m \x1b[1;33m${port}\x1b[0m                 \x1b[1;36m║\x1b[0m`);
  console.log(`\x1b[1;36m║\x1b[0m  \x1b[1mCUENTA:\x1b[0m    ${(selected.userName || '(Sin cuenta)').padEnd(38)} │ \x1b[1mESTADO:\x1b[0m     ${statusBadge}           \x1b[1;36m║\x1b[0m`);
  console.log(`\x1b[1;36m║\x1b[0m  \x1b[1mWS URL:\x1b[0m    ws://127.0.0.1:${port}                                                                        \x1b[1;36m║\x1b[0m`);
  console.log('\x1b[1;36m╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣\x1b[0m');
  
  console.log('\x1b[1;36m║\x1b[0m  📋 \x1b[1;32mPESTAÑAS ABIERTAS DETECTADAS EN VIVO (/json/list):\x1b[0m                                                               \x1b[1;36m║\x1b[0m');

  if (!cdpState.alive) {
    console.log('\x1b[1;36m║\x1b[0m     \x1b[1;31m⚠️  EL NAVEGADOR ESTÁ CERRADO O NO RESPONDE EN ESTE PUERTO.\x1b[0m                                              \x1b[1;36m║\x1b[0m');
    console.log('\x1b[1;36m║\x1b[0m     \x1b[1;33m👉 Presiona [s + Enter] para relanzar y volver a abrir la ventana inmediatamente.\x1b[0m                         \x1b[1;36m║\x1b[0m');
  } else if (cdpState.tabs.length === 0) {
    console.log('\x1b[1;36m║\x1b[0m     (Esperando carga de páginas en el navegador... presiona [r] para refrescar)                                \x1b[1;36m║\x1b[0m');
  } else {
    cdpState.tabs.slice(0, 6).forEach((t, i) => {
      const icon = getTabIcon(t.url, t.title);
      const title = (t.title || 'Sin título').slice(0, 48);
      const url = t.url.slice(0, 40);
      const line = `  [${i + 1}] ${icon} ${title} │ \x1b[2m${url}\x1b[0m`;
      console.log(`\x1b[1;36m║\x1b[0m   ${line}`.padEnd(122) + '\x1b[1;36m║\x1b[0m');
    });
    if (cdpState.tabs.length > 6) {
      console.log(`\x1b[1;36m║\x1b[0m     ... y ${cdpState.tabs.length - 6} pestañas más abiertas en esta sesión`.padEnd(113) + '\x1b[1;36m║\x1b[0m');
    }
  }

  console.log('\x1b[1;36m╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣\x1b[0m');
  if (bannerMessage) {
    console.log(`\x1b[1;36m║\x1b[0m  🔔 \x1b[1;33mNOTICIA:\x1b[0m ${bannerMessage.slice(0, 95)}`.padEnd(113) + '\x1b[1;36m║\x1b[0m');
    console.log('\x1b[1;36m╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣\x1b[0m');
  }

  console.log('\x1b[1;36m║\x1b[0m  🛠️  \x1b[1;33mACCIONES Y COMANDOS RÁPIDOS:\x1b[0m                                                                             \x1b[1;36m║\x1b[0m');
  console.log('\x1b[1;36m║\x1b[0m                                                                                                               \x1b[1;36m║\x1b[0m');
  console.log('\x1b[1;36m║\x1b[0m  \x1b[1;32m[s + Enter]\x1b[0m 🔄 \x1b[1mRelanzar Navegador\x1b[0m (si se cerró por error)     \x1b[1;36m[n + Enter]\x1b[0m 🌐 \x1b[1mAbrir Nueva Pestaña / URL\x1b[0m           \x1b[1;36m║\x1b[0m');
  console.log('\x1b[1;36m║\x1b[0m  \x1b[1;35m[w + Enter]\x1b[0m 💼 \x1b[1mInyectar Work Suite\x1b[0m (WhatsApp+Gmail+CRM)     \x1b[1;33m[r + Enter]\x1b[0m ⚡ \x1b[1mRefrescar Estado Ahora\x1b[0m              \x1b[1;36m║\x1b[0m');
  console.log('\x1b[1;36m║\x1b[0m  \x1b[1;31m[q + Enter]\x1b[0m 🚪 \x1b[1mCerrar y Liberar Puerto\x1b[0m                                                                        \x1b[1;36m║\x1b[0m');
  console.log('\x1b[1;36m╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n');
}

// --- 5. FUNCIÓN PRINCIPAL ---
async function main() {
  console.clear();
  console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║        ⚡ HYPERION BROWSER — GESTOR DE INSTANCIAS Y PERFILES MULTI-PUERTO         ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

  console.log('🔍 Escaneando navegadores, perfiles y puertos CDP activos...\n');
  const profiles = ProfileScanner.scanAllProfiles();
  const activeSessions = PortSessionManager.getActiveSessions();

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

  // Encontrar el primer perfil disponible o último usado
  let promptDefault = 1;
  if (lastProfile) {
    const lastIdx = profiles.findIndex(p => p.userDataDir === lastProfile.userDataDir && p.profileDir === lastProfile.profileDir);
    if (lastIdx >= 0) promptDefault = lastIdx + 1;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));
  
  // 1. ELECCIÓN DEL PERFIL
  const profileAnswer = (await question(`👉 Selecciona el perfil [1..${profiles.length}] (Enter para recomendado #${promptDefault}): `)).trim();

  let selectedIndex = promptDefault - 1;
  if (profileAnswer && !isNaN(Number(profileAnswer))) {
    const parsed = Number(profileAnswer) - 1;
    if (parsed >= 0 && parsed < profiles.length) {
      selectedIndex = parsed;
    }
  }

  const selected = profiles[selectedIndex];
  
  // 2. ELECCIÓN MANUAL O AUTOMÁTICA DEL PUERTO CDP
  const suggestedPort = await PortSessionManager.findNextAvailablePort(9001, 9050);
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

  // 3. AISLAMIENTO SEGURO Y CLONACIÓN COMPLETA (Garantiza que Chrome NUNCA bloquee el puerto CDP)
  const effectiveUserDataDir = PortSessionManager.getIsolatedUserDataDir(selected.browser, selected.profileDir);
  seedProfileIfNew(selected.userDataDir, selected.profileDir, effectiveUserDataDir);
  cleanProfileLocks(effectiveUserDataDir);

  const launchBrowser = () => {
    cleanProfileLocks(effectiveUserDataDir);
    const chromeFlags = [
      `--remote-debugging-port=${targetPort}`,
      '--remote-allow-origins=*',
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
  };

  launchBrowser();

  // 4. REGISTRAR SESIÓN
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

  // Esperar a que el navegador levante
  await new Promise(r => setTimeout(r, 2000));
  let currentState = await queryCdpState(targetPort);
  let bannerMessage = 'Sesión iniciada con éxito.';
  let isPrompting = false;

  drawPersistentDashboard(selected, targetPort, currentState, bannerMessage);

  // Monitor continuo cada 3.5s (solo actualiza si el usuario NO está escribiendo)
  const monitorInterval = setInterval(async () => {
    if (isPrompting) return;
    currentState = await queryCdpState(targetPort);
    drawPersistentDashboard(selected, targetPort, currentState, bannerMessage);
  }, 3500);

  const cleanupAndExit = async () => {
    clearInterval(monitorInterval);
    console.log(`\n🛑 Liberando puerto ${targetPort} y cerrando supervisor...`);
    await PortSessionManager.releaseSession(targetPort);
    process.exit(0);
  };

  // Manejador de comandos interactivos
  rl.on('line', async (line) => {
    const cmd = line.trim().toLowerCase();

    if (cmd === 'q') {
      await cleanupAndExit();
    } else if (cmd === 's') {
      // 🔄 RELANZAR NAVEGADOR
      bannerMessage = 'Relanzando navegador en el mismo perfil y puerto...';
      launchBrowser();
      await new Promise(r => setTimeout(r, 1500));
      currentState = await queryCdpState(targetPort);
      bannerMessage = 'Navegador relanzado con éxito.';
      drawPersistentDashboard(selected, targetPort, currentState, bannerMessage);
    } else if (cmd === 'w') {
      // 💼 INYECTAR WORK SUITE
      isPrompting = true;
      console.log('\n💼 INYECCIÓN DE SUITES:');
      console.log('   [1] Work Suite (WhatsApp + Gmail + CRM)');
      console.log('   [2] Social Media Suite (Instagram + Facebook + TikTok)');
      console.log('   [3] AI Hub (Gemini + Claude + ChatGPT)');
      const wAns = (await question('👉 Elige suite [1..3]: ')).trim();
      if (wAns === '1') {
        await openCdpTab(targetPort, 'https://web.whatsapp.com');
        await openCdpTab(targetPort, 'https://mail.google.com');
        bannerMessage = 'Work Suite inyectada en el navegador.';
      } else if (wAns === '2') {
        await openCdpTab(targetPort, 'https://www.instagram.com');
        await openCdpTab(targetPort, 'https://www.facebook.com');
        await openCdpTab(targetPort, 'https://www.tiktok.com');
        bannerMessage = 'Social Media Suite inyectada.';
      } else if (wAns === '3') {
        await openCdpTab(targetPort, 'https://gemini.google.com/app');
        await openCdpTab(targetPort, 'https://claude.ai');
        bannerMessage = 'AI Hub inyectado.';
      }
      isPrompting = false;
      currentState = await queryCdpState(targetPort);
      drawPersistentDashboard(selected, targetPort, currentState, bannerMessage);
    } else if (cmd === 'n') {
      // 🌐 ABRIR NUEVA PESTAÑA / URL
      isPrompting = true;
      console.log('\n🌐 ABRIR NUEVA PESTAÑA:');
      console.log('   [1] WhatsApp Web  (https://web.whatsapp.com)');
      console.log('   [2] Gmail          (https://mail.google.com)');
      console.log('   [3] Instagram      (https://www.instagram.com)');
      console.log('   [4] Facebook       (https://www.facebook.com)');
      console.log('   [5] Google Gemini  (https://gemini.google.com/app)');
      console.log('   O escribe cualquier URL directa.');

      const dest = (await question('👉 Elige opción o ingresa URL: ')).trim();
      let targetUrl = dest;
      if (dest === '1') targetUrl = 'https://web.whatsapp.com';
      else if (dest === '2') targetUrl = 'https://mail.google.com';
      else if (dest === '3') targetUrl = 'https://www.instagram.com';
      else if (dest === '4') targetUrl = 'https://www.facebook.com';
      else if (dest === '5') targetUrl = 'https://gemini.google.com/app';

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

  process.on('SIGINT', cleanupAndExit);
  process.on('SIGTERM', cleanupAndExit);
}

main().catch(err => {
  console.error('❌ Error en lanzador interactivo:', err);
  console.log('\nPresiona Enter para cerrar...');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('', () => process.exit(1));
});
