"use strict";
/**
 * HYPERION MULTI-SESSION ORCHESTRATOR
 * Central engine for multi-instance parallel browser lifecycle, watchdog auto-repair,
 * preset execution, workspace injection, and interactive CLI control.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiSessionOrchestrator = void 0;
const child_process_1 = require("child_process");
const readline = __importStar(require("readline"));
const types_1 = require("./types");
const ProfileManager_1 = require("./ProfileManager");
const CdpEndpoint_1 = require("./CdpEndpoint");
const MasterDashboard_1 = require("./MasterDashboard");
const WorkspaceManager_1 = require("./WorkspaceManager");
const PortSessionManager_1 = require("../connection/resilience/PortSessionManager");
class MultiSessionOrchestrator {
    constructor() {
        this.sessions = new Map();
        this.watchdogEnabled = false; // Disabled by default; togglable with [t]
        this.toasts = [];
        this.isInteractivePrompt = false;
        this.monitorTimer = null;
        this.rl = null;
        this.setupProcessHandlers();
    }
    /**
     * Pushes a toast notification to the dashboard
     */
    addToast(level, message) {
        const timestamp = new Date().toLocaleTimeString();
        this.toasts.push({ timestamp, level, message });
        if (this.toasts.length > 5) {
            this.toasts.shift();
        }
    }
    /**
     * Initializes and starts the master orchestrator CLI
     */
    async start() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        // 1. Scan available profiles
        const profiles = ProfileManager_1.ProfileManager.scanProfiles();
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
    async runStartupWizard(profiles) {
        console.clear();
        console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
        console.log('║        ⚡ HYPERION BROWSER — INICIALIZADOR MAESTRO MULTISESIÓN V3.5               ║');
        console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');
        console.log('┌─────┬─────────────────┬──────────────────────┬────────────────────────────────┬────────────────────────────┐');
        console.log('│  #  │ NAVEGADOR       │ NOMBRE DE PERFIL     │ CUENTA / EMAIL                 │ ESTADO                     │');
        console.log('├─────┼─────────────────┼──────────────────────┼────────────────────────────────┼────────────────────────────┤');
        const lastProfile = ProfileManager_1.ProfileManager.loadLastProfile();
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
        }
        else {
            let selectedIndex = 0;
            if (answer && !isNaN(Number(answer))) {
                const parsed = Number(answer) - 1;
                if (parsed >= 0 && parsed < profiles.length)
                    selectedIndex = parsed;
            }
            const selected = profiles[selectedIndex];
            const suggestedPort = await PortSessionManager_1.PortSessionManager.findNextAvailablePort(9001, 9050);
            const portAnswer = (await this.ask(`👉 Ingresa el Puerto CDP [Enter para ${suggestedPort}]: `)).trim();
            let targetPort = suggestedPort;
            if (portAnswer && !isNaN(Number(portAnswer))) {
                const customPort = Number(portAnswer);
                if (customPort >= 1024 && customPort <= 65535)
                    targetPort = customPort;
            }
            await this.launchSession(selected, targetPort);
        }
        this.addToast('success', 'Arranque completado con éxito.');
    }
    /**
     * Launches the dual master preset (Work 9001 + Personal 9002)
     */
    async launchMasterPreset(profiles) {
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
    async launchSession(profile, port) {
        ProfileManager_1.ProfileManager.saveLastProfile(profile);
        // Preparar directorio de perfil aislado y clonar cookies/credenciales
        const effectiveUserDataDir = PortSessionManager_1.PortSessionManager.getIsolatedUserDataDir(profile.browser, profile.profileDir);
        ProfileManager_1.ProfileManager.seedProfileIfNew(profile.userDataDir, profile.profileDir, effectiveUserDataDir);
        ProfileManager_1.ProfileManager.cleanLocks(effectiveUserDataDir);
        const args = [
            `--remote-debugging-port=${port}`,
            '--remote-allow-origins=*',
            `--user-data-dir=${effectiveUserDataDir}`,
            `--profile-directory=${profile.profileDir}`,
            '--no-first-run',
            '--restore-last-session',
            '--no-sandbox',
            '--test-type',
            'https://mail.google.com',
            'https://web.whatsapp.com',
            'https://www.instagram.com',
            'https://www.facebook.com'
        ];
        const child = (0, child_process_1.spawn)(profile.exe, args, { detached: true, stdio: 'ignore' });
        child.unref();
        // Register session in memory
        const session = {
            id: `session_${port}`,
            port,
            profile,
            effectiveUserDataDir,
            status: types_1.HealthState.RECONNECTING,
            tabs: [],
            latencyMs: 0,
            startedAt: new Date().toISOString(),
            wsUrl: `ws://127.0.0.1:${port}`,
            lastLaunchTime: Date.now(),
            retryCount: 0,
        };
        this.sessions.set(port, session);
        // Register session in PortSessionManager
        await PortSessionManager_1.PortSessionManager.registerSession({
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
    startHealthMonitor() {
        if (this.monitorTimer)
            clearInterval(this.monitorTimer);
        this.monitorTimer = setInterval(async () => {
            if (this.isInteractivePrompt)
                return;
            const sessionsList = Array.from(this.sessions.values());
            for (const session of sessionsList) {
                const pingRes = await CdpEndpoint_1.CdpEndpoint.measurePing(session.port);
                session.latencyMs = pingRes.latencyMs;
                if (pingRes.alive) {
                    const tabRes = await CdpEndpoint_1.CdpEndpoint.getTabs(session.port);
                    session.status = tabRes.status;
                    session.tabs = tabRes.tabs;
                    session.retryCount = 0;
                }
                else {
                    const timeSinceLaunch = Date.now() - (session.lastLaunchTime || 0);
                    if (timeSinceLaunch < 8000) {
                        session.status = types_1.HealthState.RECONNECTING;
                    }
                    else {
                        session.status = types_1.HealthState.OFFLINE;
                        session.tabs = [];
                        if (this.watchdogEnabled && (session.retryCount || 0) < 2 && timeSinceLaunch > 15000) {
                            session.retryCount = (session.retryCount || 0) + 1;
                            this.addToast('warn', `🛡️ Watchdog: Sesión en puerto ${session.port} caída. Auto-relanzando (intento ${session.retryCount})...`);
                            this.relaunchSession(session.port);
                        }
                    }
                }
            }
            const viewState = {
                sessions: sessionsList,
                watchdogEnabled: this.watchdogEnabled,
                selectedSessionIndex: 0,
                toasts: this.toasts,
                lastRefresh: new Date().toLocaleTimeString(),
            };
            MasterDashboard_1.MasterDashboard.render(viewState);
        }, 2500);
    }
    /**
     * Relaunches a specific session with identical profile and port
     */
    async relaunchSession(port) {
        const session = this.sessions.get(port);
        if (!session)
            return;
        ProfileManager_1.ProfileManager.cleanLocks(session.effectiveUserDataDir);
        const args = [
            `--remote-debugging-port=${port}`,
            '--remote-allow-origins=*',
            `--user-data-dir=${session.effectiveUserDataDir}`,
            `--profile-directory=${session.profile.profileDir}`,
            '--no-first-run',
            '--restore-last-session',
            '--no-sandbox',
            '--test-type'
        ];
        const child = (0, child_process_1.spawn)(session.profile.exe, args, { detached: true, stdio: 'ignore' });
        child.unref();
        session.lastLaunchTime = Date.now();
        session.status = types_1.HealthState.RECONNECTING;
        this.addToast('info', `Relanzado puerto ${port} (${session.profile.name})`);
    }
    /**
     * Listens and executes interactive commands from the master console
     */
    setupCommandListener() {
        if (!this.rl)
            return;
        this.rl.on('line', async (line) => {
            const cmd = line.trim().toLowerCase();
            if (cmd === 'q') {
                await this.shutdown();
            }
            else if (cmd === 's') {
                await this.handleRelaunchPrompt();
            }
            else if (cmd === 'a') {
                await this.handleAddSessionPrompt();
            }
            else if (cmd === 'm') {
                const profiles = ProfileManager_1.ProfileManager.scanProfiles();
                await this.launchMasterPreset(profiles);
            }
            else if (cmd === 'w') {
                await this.handleWorkspacePrompt();
            }
            else if (cmd === 'n') {
                await this.handleNewTabPrompt();
            }
            else if (cmd === 'c') {
                await this.handleScreenshotPrompt();
            }
            else if (cmd === 'k') {
                await this.handleKillPrompt();
            }
            else if (cmd === 'l') {
                this.handleCleanLocks();
            }
            else if (cmd === 't') {
                this.watchdogEnabled = !this.watchdogEnabled;
                this.addToast('info', `Modo Watchdog: ${this.watchdogEnabled ? 'ACTIVADO 🛡️' : 'DESACTIVADO ⚪'}`);
            }
            else if (cmd === 'p') {
                await this.handleListSessionsPrompt();
            }
            else if (cmd === 'r') {
                this.addToast('info', 'Refresco forzado ejecutado.');
            }
        });
    }
    async handleRelaunchPrompt() {
        this.isInteractivePrompt = true;
        const sessionPorts = Array.from(this.sessions.keys());
        if (sessionPorts.length === 0) {
            console.log('\n❌ No hay sesiones registradas para relanzar.');
        }
        else {
            console.log(`\n🔄 SESIONES REGISTRADAS: ${sessionPorts.join(', ')} (o escribe 'all')`);
            const target = (await this.ask('👉 Puerto a relanzar: ')).trim();
            if (target === 'all') {
                for (const p of sessionPorts)
                    await this.relaunchSession(p);
            }
            else if (!isNaN(Number(target)) && this.sessions.has(Number(target))) {
                await this.relaunchSession(Number(target));
            }
        }
        this.isInteractivePrompt = false;
    }
    async handleAddSessionPrompt() {
        this.isInteractivePrompt = true;
        const profiles = ProfileManager_1.ProfileManager.scanProfiles();
        console.log('\n➕ SELECCIONA EL NUEVO PERFIL A LANZAR:');
        profiles.slice(0, 10).forEach((p, i) => {
            console.log(`   [${i + 1}] ${p.browser} - ${p.name} (${p.userName || p.profileDir})`);
        });
        const ans = (await this.ask('👉 Número de perfil [1..10]: ')).trim();
        const idx = Number(ans) - 1;
        if (idx >= 0 && idx < profiles.length) {
            const selected = profiles[idx];
            const nextPort = await PortSessionManager_1.PortSessionManager.findNextAvailablePort(9001, 9050);
            const portAns = (await this.ask(`👉 Puerto CDP [Enter para ${nextPort}]: `)).trim();
            const port = portAns && !isNaN(Number(portAns)) ? Number(portAns) : nextPort;
            await this.launchSession(selected, port);
        }
        this.isInteractivePrompt = false;
    }
    async handleWorkspacePrompt() {
        this.isInteractivePrompt = true;
        const workspaces = WorkspaceManager_1.WorkspaceManager.getWorkspaces();
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
                await WorkspaceManager_1.WorkspaceManager.injectWorkspace(port, ws.id);
                this.addToast('success', `Suite "${ws.name}" inyectada en puerto ${port}.`);
            }
        }
        this.isInteractivePrompt = false;
    }
    async handleNewTabPrompt() {
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
        if (urlAns === '1')
            targetUrl = 'https://web.whatsapp.com';
        else if (urlAns === '2')
            targetUrl = 'https://mail.google.com';
        else if (urlAns === '3')
            targetUrl = 'https://www.instagram.com';
        else if (urlAns === '4')
            targetUrl = 'https://www.facebook.com';
        else if (urlAns === '5')
            targetUrl = 'https://gemini.google.com/app';
        if (targetUrl) {
            const ports = Array.from(this.sessions.keys());
            const pAns = ports.length > 1 ? (await this.ask(`👉 Puerto destino (${ports.join(', ')}): `)).trim() : ports[0].toString();
            const port = Number(pAns);
            if (this.sessions.has(port)) {
                await CdpEndpoint_1.CdpEndpoint.openTab(port, targetUrl);
                this.addToast('success', `Pestaña abierta en puerto ${port}: ${targetUrl}`);
            }
        }
        this.isInteractivePrompt = false;
    }
    async handleScreenshotPrompt() {
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
    async handleKillPrompt() {
        this.isInteractivePrompt = true;
        console.log('\n🛑 DETENER SESIÓN:');
        console.log('   [1] Cerrar una sesión específica');
        console.log('   [2] Cerrar TODAS las sesiones y apagar navegadores');
        const opt = (await this.ask('👉 Opción [1 o 2]: ')).trim();
        if (opt === '2') {
            try {
                (0, child_process_1.execSync)('taskkill /f /im chrome.exe /im msedge.exe /im brave.exe >nul 2>&1', { stdio: 'ignore' });
                this.addToast('warn', 'Todos los procesos de navegador detenidos.');
            }
            catch { }
        }
        else {
            const ports = Array.from(this.sessions.keys());
            const pAns = (await this.ask(`👉 Puerto a detener (${ports.join(', ')}): `)).trim();
            const port = Number(pAns);
            if (this.sessions.has(port)) {
                this.sessions.delete(port);
                await PortSessionManager_1.PortSessionManager.releaseSession(port);
                this.addToast('info', `Sesión del puerto ${port} detenida y liberada.`);
            }
        }
        this.isInteractivePrompt = false;
    }
    handleCleanLocks() {
        for (const session of this.sessions.values()) {
            ProfileManager_1.ProfileManager.cleanLocks(session.effectiveUserDataDir);
            ProfileManager_1.ProfileManager.cleanLocks(session.profile.userDataDir);
        }
        this.addToast('success', '🧹 Bloqueos de perfil (SingletonLock) eliminados en todas las sesiones.');
    }
    async handleListSessionsPrompt() {
        this.isInteractivePrompt = true;
        const all = await PortSessionManager_1.PortSessionManager.getActiveSessions();
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
    ask(query) {
        return new Promise(resolve => {
            if (!this.rl)
                resolve('');
            else
                this.rl.question(query, resolve);
        });
    }
    async shutdown() {
        if (this.monitorTimer)
            clearInterval(this.monitorTimer);
        console.log('\n🛑 Liberando todas las sesiones y cerrando Hyperion Master Control...');
        for (const port of this.sessions.keys()) {
            await PortSessionManager_1.PortSessionManager.releaseSession(port);
        }
        process.exit(0);
    }
    setupProcessHandlers() {
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
    }
}
exports.MultiSessionOrchestrator = MultiSessionOrchestrator;
//# sourceMappingURL=MultiSessionOrchestrator.js.map