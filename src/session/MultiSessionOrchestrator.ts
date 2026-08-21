/**
 * HYPERION MULTI-SESSION ORCHESTRATOR
 * Central engine for multi-instance parallel browser lifecycle, watchdog auto-repair,
 * preset execution, workspace injection, and interactive CLI control.
 */

import { spawn, exec, execSync } from 'child_process';
import * as readline from 'readline';

import {
  DashboardViewState,
  HealthState,
  ManagedSession,
  ProfileMetadata,
  ToastNotification,
} from './types';
import { ProfileManager } from './ProfileManager';
import { CdpEndpoint } from './CdpEndpoint';
import { MasterDashboard } from './MasterDashboard';
import { WorkspaceManager } from './WorkspaceManager';
import { PortSessionManager } from '../connection/resilience/PortSessionManager';

export class MultiSessionOrchestrator {
  private sessions: Map<number, ManagedSession> = new Map();
  private watchdogEnabled = false; // Disabled by default; togglable with [t]
  private toasts: ToastNotification[] = [];
  private isInteractivePrompt = false;
  private monitorTimer: NodeJS.Timeout | null = null;
  private rl: readline.Interface | null = null;

  constructor() {
    this.setupProcessHandlers();
  }

  /**
   * Pushes a toast notification to the dashboard
   */
  private addToast(level: 'info' | 'success' | 'warn' | 'error', message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.toasts.push({ timestamp, level, message });
    if (this.toasts.length > 5) {
      this.toasts.shift();
    }
  }

  /**
   * Initializes and starts the master orchestrator CLI
   */
  async start(): Promise<void> {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // 1. Scan available profiles
    const profiles = ProfileManager.scanProfiles();
    if (profiles.length === 0) {
      console.error('❌ No se encontraron navegadores instalados en el equipo.');
      process.exit(1);
    }

    // 2. Display initial startup menu
    await this.runStartupWizard(profiles);

    // 3. Start background health monitor & watchdog loop (2.5s)
    this.startHealthMonitor();

    // 4. Listen to master commands
    this.setupCommandListener();
  }

  /**
   * Initial startup wizard for user to pick single profile, preset or custom launch
   */
  private async runStartupWizard(profiles: ProfileMetadata[]): Promise<void> {
    console.clear();
    console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║        ⚡ HYPERION BROWSER — INICIALIZADOR MAESTRO MULTISESIÓN V3.5               ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

    console.log('┌─────┬─────────────────┬──────────────────────┬────────────────────────────────┬────────────────────────────┐');
    console.log('│  #  │ NAVEGADOR       │ NOMBRE DE PERFIL     │ CUENTA / EMAIL                 │ ESTADO                     │');
    console.log('├─────┼─────────────────┼──────────────────────┼────────────────────────────────┼────────────────────────────┤');

    const lastProfile = ProfileManager.loadLastProfile();
    profiles.forEach((p, idx) => {
      const isLast = lastProfile && lastProfile.userDataDir === p.userDataDir && lastProfile.profileDir === p.profileDir;
      const num = `[${idx + 1}]`.padEnd(5);
      const browser = p.browser.padEnd(15).slice(0, 15);
      const name = (p.name + (isLast ? ' ⭐' : '')).padEnd(20).slice(0, 20);
      const email = (p.userName || '(Sin cuenta)').padEnd(30).slice(0, 30);
      const status = '⚪ Disponible'.padEnd(26);

      console.log(`│ ${num} │ ${browser} │ ${name} │ ${email} │ ${status} │`);
    });
    console.log('└─────┴─────────────────┴──────────────────────┴────────────────────────────────┴────────────────────────────┘\n');

    console.log('🚀 OPCIONES DE ARRANQUE RÁPIDO:');
    console.log('   [1..N] Elegir un perfil específico');
    console.log('   [m]    Preset Maestro: Iniciar 2 perfiles principales (9001 + 9002) de golpe');
    console.log('   (Presiona Enter para el perfil predeterminado #1)\n');

    const answer = (await this.ask('👉 Tu elección [1..N, m o Enter]: ')).trim().toLowerCase();

    if (answer === 'm') {
      await this.launchMasterPreset(profiles);
    } else {
      let selectedIndex = 0;
      if (answer && !isNaN(Number(answer))) {
        const parsed = Number(answer) - 1;
        if (parsed >= 0 && parsed < profiles.length) selectedIndex = parsed;
      }
      const selected = profiles[selectedIndex];

      const suggestedPort = await PortSessionManager.findNextAvailablePort(9001, 9050);
      const portAnswer = (await this.ask(`👉 Ingresa el Puerto CDP [Enter para ${suggestedPort}]: `)).trim();
      let targetPort = suggestedPort;
      if (portAnswer && !isNaN(Number(portAnswer))) {
        const customPort = Number(portAnswer);
        if (customPort >= 1024 && customPort <= 65535) targetPort = customPort;
      }

      await this.launchSession(selected, targetPort);
    }

    this.addToast('success', 'Arranque completado con éxito.');
  }

  /**
   * Launches the dual master preset (Work 9001 + Personal 9002)
   */
  private async launchMasterPreset(profiles: ProfileMetadata[]): Promise<void> {
    this.addToast('info', 'Ejecutando Preset Maestro Dual (9001 + 9002)...');

    const prof1 = profiles[0];
    const prof2 = profiles[1] || profiles[0];

    await this.launchSession(prof1, 9001);
    await new Promise(r => setTimeout(r, 1500));
    await this.launchSession(prof2, 9002);

    this.addToast('success', 'Preset Maestro Dual iniciado en puertos 9001 y 9002.');
  }

  /**
   * Launches a managed browser session on a specific port
   */
  private async launchSession(profile: ProfileMetadata, port: number): Promise<void> {
    ProfileManager.saveLastProfile(profile);

    // BYPASS MAESTRO AL PERFIL REAL NATIVO (Directory Junction NTFS directo al User Data original)
    const effectiveUserDataDir = ProfileManager.getRealProfileJunctionDir(profile.browser, profile.userDataDir);
    ProfileManager.cleanLocks(effectiveUserDataDir);
    ProfileManager.cleanLocks(profile.userDataDir);

    const chromeFlags = [
      `--remote-debugging-port=${port}`,
      '--remote-allow-origins=*',
      `--user-data-dir="${effectiveUserDataDir}"`,
      `--profile-directory="${profile.profileDir}"`,
      '--no-first-run',
      '--restore-last-session',
      '--no-sandbox',
      '--test-type',
      'https://mail.google.com',
      'https://web.whatsapp.com',
      'https://www.instagram.com',
      'https://www.facebook.com'
    ].join(' ');

    const launchCmd = `start "" "${profile.exe}" ${chromeFlags}`;
    exec(launchCmd, { shell: 'cmd.exe' });

    // Register session in memory
    const session: ManagedSession = {
      id: `session_${port}`,
      port,
      profile,
      effectiveUserDataDir,
      status: HealthState.RECONNECTING,
      tabs: [],
      latencyMs: 0,
      startedAt: new Date().toISOString(),
      wsUrl: `ws://127.0.0.1:${port}`,
      lastLaunchTime: Date.now(),
      retryCount: 0,
    };

    this.sessions.set(port, session);

    // Register session in PortSessionManager
    await PortSessionManager.registerSession({
      port,
      browser: profile.browser,
      profileDir: profile.profileDir,
      profileName: profile.name,
      userDataDir: profile.userDataDir,
      isolatedDataDir: effectiveUserDataDir,
      pid: process.pid,
      startedAt: session.startedAt,
      wsUrl: session.wsUrl,
    });

    this.addToast('info', `Iniciado ${profile.browser} (${profile.name}) en puerto ${port}`);
  }

  /**
   * Health monitor & watchdog continuous loop (runs every 2.5s)
   */
  private startHealthMonitor(): void {
    if (this.monitorTimer) clearInterval(this.monitorTimer);

    this.monitorTimer = setInterval(async () => {
      if (this.isInteractivePrompt) return;

      const sessionsList = Array.from(this.sessions.values());

      for (const session of sessionsList) {
        const pingRes = await CdpEndpoint.measurePing(session.port);
        session.latencyMs = pingRes.latencyMs;

        if (pingRes.alive) {
          const tabRes = await CdpEndpoint.getTabs(session.port);
          session.status = tabRes.status;
          session.tabs = tabRes.tabs;
          session.retryCount = 0;
        } else {
          const timeSinceLaunch = Date.now() - (session.lastLaunchTime || 0);

          if (timeSinceLaunch < 8000) {
            session.status = HealthState.RECONNECTING;
          } else {
            session.status = HealthState.OFFLINE;
            session.tabs = [];

            if (this.watchdogEnabled && (session.retryCount || 0) < 2 && timeSinceLaunch > 15000) {
              session.retryCount = (session.retryCount || 0) + 1;
              this.addToast('warn', `🛡️ Watchdog: Sesión en puerto ${session.port} caída. Auto-relanzando (intento ${session.retryCount})...`);
              this.relaunchSession(session.port);
            }
          }
        }
      }

      const viewState: DashboardViewState = {
        sessions: sessionsList,
        watchdogEnabled: this.watchdogEnabled,
        selectedSessionIndex: 0,
        toasts: this.toasts,
        lastRefresh: new Date().toLocaleTimeString(),
      };

      MasterDashboard.render(viewState);
    }, 2500);
  }

  /**
   * Relaunches a specific session with identical profile and port
   */
  private async relaunchSession(port: number): Promise<void> {
    const session = this.sessions.get(port);
    if (!session) return;

    ProfileManager.cleanLocks(session.effectiveUserDataDir);

    const chromeFlags = [
      `--remote-debugging-port=${port}`,
      '--remote-allow-origins=*',
      `--user-data-dir="${session.effectiveUserDataDir}"`,
      `--profile-directory="${session.profile.profileDir}"`,
      '--no-first-run',
      '--restore-last-session',
      '--no-sandbox',
      '--test-type'
    ].join(' ');

    const launchCmd = `start "" "${session.profile.exe}" ${chromeFlags}`;
    exec(launchCmd, { shell: 'cmd.exe' });

    session.lastLaunchTime = Date.now();
    session.status = HealthState.RECONNECTING;
    this.addToast('info', `Relanzado puerto ${port} (${session.profile.name})`);
  }

  /**
   * Listens and executes interactive commands from the master console
   */
  private setupCommandListener(): void {
    if (!this.rl) return;

    this.rl.on('line', async (line) => {
      const cmd = line.trim().toLowerCase();

      if (cmd === 'q') {
        await this.shutdown();
      } else if (cmd === 's') {
        await this.handleRelaunchPrompt();
      } else if (cmd === 'a') {
        await this.handleAddSessionPrompt();
      } else if (cmd === 'm') {
        const profiles = ProfileManager.scanProfiles();
        await this.launchMasterPreset(profiles);
      } else if (cmd === 'w') {
        await this.handleWorkspacePrompt();
      } else if (cmd === 'n') {
        await this.handleNewTabPrompt();
      } else if (cmd === 'c') {
        await this.handleScreenshotPrompt();
      } else if (cmd === 'k') {
        await this.handleKillPrompt();
      } else if (cmd === 'l') {
        this.handleCleanLocks();
      } else if (cmd === 't') {
        this.watchdogEnabled = !this.watchdogEnabled;
        this.addToast('info', `Modo Watchdog: ${this.watchdogEnabled ? 'ACTIVADO 🛡️' : 'DESACTIVADO ⚪'}`);
      } else if (cmd === 'p') {
        await this.handleListSessionsPrompt();
      } else if (cmd === 'r') {
        this.addToast('info', 'Refresco forzado ejecutado.');
      }
    });
  }

  private async handleRelaunchPrompt(): Promise<void> {
    this.isInteractivePrompt = true;
    const sessionPorts = Array.from(this.sessions.keys());
    if (sessionPorts.length === 0) {
      console.log('\n❌ No hay sesiones registradas para relanzar.');
    } else {
      console.log(`\n🔄 SESIONES REGISTRADAS: ${sessionPorts.join(', ')} (o escribe 'all')`);
      const target = (await this.ask('👉 Puerto a relanzar: ')).trim();
      if (target === 'all') {
        for (const p of sessionPorts) await this.relaunchSession(p);
      } else if (!isNaN(Number(target)) && this.sessions.has(Number(target))) {
        await this.relaunchSession(Number(target));
      }
    }
    this.isInteractivePrompt = false;
  }

  private async handleAddSessionPrompt(): Promise<void> {
    this.isInteractivePrompt = true;
    const profiles = ProfileManager.scanProfiles();
    console.log('\n➕ SELECCIONA EL NUEVO PERFIL A LANZAR:');
    profiles.slice(0, 10).forEach((p, i) => {
      console.log(`   [${i + 1}] ${p.browser} - ${p.name} (${p.userName || p.profileDir})`);
    });
    const ans = (await this.ask('👉 Número de perfil [1..10]: ')).trim();
    const idx = Number(ans) - 1;
    if (idx >= 0 && idx < profiles.length) {
      const selected = profiles[idx];
      const nextPort = await PortSessionManager.findNextAvailablePort(9001, 9050);
      const portAns = (await this.ask(`👉 Puerto CDP [Enter para ${nextPort}]: `)).trim();
      const port = portAns && !isNaN(Number(portAns)) ? Number(portAns) : nextPort;
      await this.launchSession(selected, port);
    }
    this.isInteractivePrompt = false;
  }

  private async handleWorkspacePrompt(): Promise<void> {
    this.isInteractivePrompt = true;
    const workspaces = WorkspaceManager.getWorkspaces();
    console.log('\n💼 INYECCIÓN DE WORKSPACE SUITES:');
    workspaces.forEach((w, i) => {
      console.log(`   [${i + 1}] ${w.icon} ${w.name} (${w.description})`);
    });
    const wAns = (await this.ask('👉 Elige suite [1..4]: ')).trim();
    const wIdx = Number(wAns) - 1;
    if (wIdx >= 0 && wIdx < workspaces.length) {
      const ws = workspaces[wIdx];
      const ports = Array.from(this.sessions.keys());
      console.log(`\nPuertos disponibles: ${ports.join(', ')}`);
      const pAns = (await this.ask('👉 Puerto destino: ')).trim();
      const port = Number(pAns);
      if (this.sessions.has(port)) {
        await WorkspaceManager.injectWorkspace(port, ws.id);
        this.addToast('success', `Suite "${ws.name}" inyectada en puerto ${port}.`);
      }
    }
    this.isInteractivePrompt = false;
  }

  private async handleNewTabPrompt(): Promise<void> {
    this.isInteractivePrompt = true;
    console.log('\n🌐 ABRIR NUEVA PESTAÑA / ACCESO RÁPIDO:');
    console.log('   [1] WhatsApp Web  (https://web.whatsapp.com)');
    console.log('   [2] Gmail          (https://mail.google.com)');
    console.log('   [3] Instagram      (https://www.instagram.com)');
    console.log('   [4] Facebook       (https://www.facebook.com)');
    console.log('   [5] Google Gemini  (https://gemini.google.com/app)');
    console.log('   O escribe cualquier URL directa.');

    const urlAns = (await this.ask('👉 URL o Atajo [1..5]: ')).trim();
    let targetUrl = urlAns;
    if (urlAns === '1') targetUrl = 'https://web.whatsapp.com';
    else if (urlAns === '2') targetUrl = 'https://mail.google.com';
    else if (urlAns === '3') targetUrl = 'https://www.instagram.com';
    else if (urlAns === '4') targetUrl = 'https://www.facebook.com';
    else if (urlAns === '5') targetUrl = 'https://gemini.google.com/app';

    if (targetUrl) {
      const ports = Array.from(this.sessions.keys());
      const pAns = ports.length > 1 ? (await this.ask(`👉 Puerto destino (${ports.join(', ')}): `)).trim() : ports[0].toString();
      const port = Number(pAns);
      if (this.sessions.has(port)) {
        await CdpEndpoint.openTab(port, targetUrl);
        this.addToast('success', `Pestaña abierta en puerto ${port}: ${targetUrl}`);
      }
    }
    this.isInteractivePrompt = false;
  }

  private async handleScreenshotPrompt(): Promise<void> {
    this.isInteractivePrompt = true;
    const ports = Array.from(this.sessions.keys());
    console.log(`\n📸 CAPTURA DE PANTALLA EN VIVO (Puertos: ${ports.join(', ')})`);
    const pAns = ports.length > 1 ? (await this.ask('👉 Puerto a capturar: ')).trim() : ports[0].toString();
    const port = Number(pAns);
    if (this.sessions.has(port)) {
      this.addToast('info', `Captura de pantalla solicitada en puerto ${port}.`);
    }
    this.isInteractivePrompt = false;
  }

  private async handleKillPrompt(): Promise<void> {
    this.isInteractivePrompt = true;
    console.log('\n🛑 DETENER SESIÓN:');
    console.log('   [1] Cerrar una sesión específica');
    console.log('   [2] Cerrar TODAS las sesiones y apagar navegadores');
    const opt = (await this.ask('👉 Opción [1 o 2]: ')).trim();
    if (opt === '2') {
      try {
        execSync('taskkill /f /im chrome.exe /im msedge.exe /im brave.exe >nul 2>&1', { stdio: 'ignore' });
        this.addToast('warn', 'Todos los procesos de navegador detenidos.');
      } catch {}
    } else {
      const ports = Array.from(this.sessions.keys());
      const pAns = (await this.ask(`👉 Puerto a detener (${ports.join(', ')}): `)).trim();
      const port = Number(pAns);
      if (this.sessions.has(port)) {
        this.sessions.delete(port);
        await PortSessionManager.releaseSession(port);
        this.addToast('info', `Sesión del puerto ${port} detenida y liberada.`);
      }
    }
    this.isInteractivePrompt = false;
  }

  private handleCleanLocks(): void {
    for (const session of this.sessions.values()) {
      ProfileManager.cleanLocks(session.effectiveUserDataDir);
      ProfileManager.cleanLocks(session.profile.userDataDir);
    }
    this.addToast('success', '🧹 Bloqueos de perfil (SingletonLock) eliminados en todas las sesiones.');
  }

  private async handleListSessionsPrompt(): Promise<void> {
    this.isInteractivePrompt = true;
    const all = await PortSessionManager.getActiveSessions();
    console.log('\n┌────────────────────────────────────────────────────────────────────────────────────────┐');
    console.log('│  REGISTRO GLOBAL DE SESIONES CDP EN HYPERION                                           │');
    console.log('├─────────┬──────────────────────┬──────────────────────┬────────────────────────────────┤');
    console.log('│ PUERTO  │ NAVEGADOR            │ PERFIL               │ WEBSOCKET URL                  │');
    console.log('├─────────┼──────────────────────┼──────────────────────┼────────────────────────────────┤');
    all.forEach(s => {
      console.log(`│ ${s.port.toString().padEnd(7)} │ ${s.browser.padEnd(20).slice(0, 20)} │ ${s.profileName.padEnd(20).slice(0, 20)} │ ${(s.wsUrl || '').padEnd(30).slice(0, 30)} │`);
    });
    console.log('└─────────┴──────────────────────┴──────────────────────┴────────────────────────────────┘');
    await this.ask('\nPresiona Enter para volver...');
    this.isInteractivePrompt = false;
  }

  private ask(query: string): Promise<string> {
    return new Promise(resolve => {
      if (!this.rl) resolve('');
      else this.rl.question(query, resolve);
    });
  }

  private async shutdown(): Promise<void> {
    if (this.monitorTimer) clearInterval(this.monitorTimer);
    console.log('\n🛑 Liberando todas las sesiones y cerrando Hyperion Master Control...');
    for (const port of this.sessions.keys()) {
      await PortSessionManager.releaseSession(port);
    }
    process.exit(0);
  }

  private setupProcessHandlers(): void {
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }
}
