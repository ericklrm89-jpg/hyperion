"use strict";
/**
 * HYPERION MASTER DASHBOARD RENDERER
 * Ultra-aesthetic Cyberpunk/Clean Enterprise terminal UI engine with dual-matrix view,
 * real-time tab stream, latency metrics, and toast notifications.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasterDashboard = void 0;
const types_1 = require("./types");
class MasterDashboard {
    /**
     * Renders the complete, self-refreshing Master Control Center UI
     */
    static render(state) {
        console.clear();
        const totalSessions = state.sessions.length;
        const activeSessions = state.sessions.filter(s => s.status === types_1.HealthState.ONLINE).length;
        const avgLatency = state.sessions.length > 0
            ? (state.sessions.reduce((acc, s) => acc + s.latencyMs, 0) / state.sessions.length).toFixed(1)
            : '0.0';
        const globalBadge = activeSessions > 0
            ? `\x1b[1;32m🟢 ${activeSessions}/${totalSessions} SESIONES VIVAS\x1b[0m`
            : `\x1b[1;31m🔴 SIN SESIONES ACTIVAS\x1b[0m`;
        const watchdogBadge = state.watchdogEnabled ? this.BADGE_WATCHDOG_ON : this.BADGE_WATCHDOG_OFF;
        // 1. HEADER
        console.log(`${this.C_CYAN}╔═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗${this.C_RESET}`);
        console.log(`${this.C_CYAN}║${this.C_RESET}   ${this.C_BOLD}${this.C_MAGENTA}⚡ HYPERION MASTER CONTROL CENTER V3.5${this.C_RESET} — ${this.C_BOLD}ORQUESTADOR MULTISESIÓN DE NAVEGADORES (ALL-IN-ONE)${this.C_RESET}              ${this.C_CYAN}║${this.C_RESET}`);
        console.log(`${this.C_CYAN}╠═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣${this.C_RESET}`);
        console.log(`${this.C_CYAN}║${this.C_RESET}  ${this.C_BOLD}ESTADO:${this.C_RESET} ${globalBadge} │ ${this.C_BOLD}WATCHDOG:${this.C_RESET} ${watchdogBadge} │ ${this.C_BOLD}LATENCIA MEDIA:${this.C_RESET} ${this.C_YELLOW}${avgLatency} ms${this.C_RESET} │ ${this.C_BOLD}ACTUALIZADO:${this.C_RESET} ${state.lastRefresh}       ${this.C_CYAN}║${this.C_RESET}`);
        console.log(`${this.C_CYAN}╠═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣${this.C_RESET}`);
        // 2. MATRIZ DE SESIONES EN PARALELO
        console.log(`${this.C_CYAN}║${this.C_RESET}  ${this.C_BOLD}${this.C_YELLOW}MATRIZ DE SESIONES EN PARALELO:${this.C_RESET}                                                                                            ${this.C_CYAN}║${this.C_RESET}`);
        console.log(`${this.C_CYAN}║${this.C_RESET}  ┌───┬────────┬─────────────────┬────────────────────────────────┬──────────────┬──────────────┬─────────────┬───────────┐  ${this.C_CYAN}║${this.C_RESET}`);
        console.log(`${this.C_CYAN}║${this.C_RESET}  │ # │ PUERTO │ NAVEGADOR       │ CUENTA / CORREO                │ PERFIL DIR   │ ESTADO       │ PESTAÑAS    │ PING (ms) │  ${this.C_CYAN}║${this.C_RESET}`);
        console.log(`${this.C_CYAN}║${this.C_RESET}  ├───┼────────┼─────────────────┼────────────────────────────────┼──────────────┼──────────────┼─────────────┼───────────┤  ${this.C_CYAN}║${this.C_RESET}`);
        if (state.sessions.length === 0) {
            console.log(`${this.C_CYAN}║${this.C_RESET}  │   │        │                 │ (No hay sesiones activas)      │              │              │             │           │  ${this.C_CYAN}║${this.C_RESET}`);
        }
        else {
            state.sessions.forEach((s, idx) => {
                const num = `[${idx + 1}]`.padEnd(3);
                const port = s.port.toString().padEnd(6);
                const browser = s.profile.browser.padEnd(15).slice(0, 15);
                const email = (s.profile.userName || s.profile.name || '(Sin cuenta)').padEnd(30).slice(0, 30);
                const profileDir = s.profile.profileDir.padEnd(12).slice(0, 12);
                let statusStr = '🟢 ACTIVO   ';
                if (s.status === types_1.HealthState.OFFLINE)
                    statusStr = '🔴 OFFLINE  ';
                else if (s.status === types_1.HealthState.RECONNECTING)
                    statusStr = '🟡 RECONECT ';
                const tabsCount = `${s.tabs.length} tabs`.padEnd(11);
                const ping = `${s.latencyMs.toFixed(1)} ms`.padEnd(9);
                console.log(`${this.C_CYAN}║${this.C_RESET}  │ ${num}│ ${port} │ ${browser} │ ${email} │ ${profileDir} │ ${statusStr} │ ${tabsCount} │ ${ping} │  ${this.C_CYAN}║${this.C_RESET}`);
            });
        }
        console.log(`${this.C_CYAN}║${this.C_RESET}  └───┴────────┴─────────────────┴────────────────────────────────┴──────────────┴──────────────┴─────────────┴───────────┘  ${this.C_CYAN}║${this.C_RESET}`);
        console.log(`${this.C_CYAN}╠═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣${this.C_RESET}`);
        // 3. STREAM DE PESTAÑAS EN TIEMPO REAL
        console.log(`${this.C_CYAN}║${this.C_RESET}  📋 ${this.C_BOLD}${this.C_GREEN}STREAM DE PESTAÑAS DETECTADAS EN VIVO (CDP /json/list):${this.C_RESET}                                                                  ${this.C_CYAN}║${this.C_RESET}`);
        let renderedTabs = 0;
        state.sessions.forEach((s) => {
            if (s.status === types_1.HealthState.OFFLINE) {
                console.log(`${this.C_CYAN}║${this.C_RESET}     ${this.C_RED}⚠️  [Puerto ${s.port}] NAVEGADOR CERRADO. Presiona [s + Enter] para reabrir.${this.C_RESET}`.padEnd(127) + `${this.C_CYAN}║${this.C_RESET}`);
            }
            else if (s.tabs.length === 0) {
                console.log(`${this.C_CYAN}║${this.C_RESET}     [Puerto ${s.port}] (Conectando... esperando páginas)`.padEnd(113) + `${this.C_CYAN}║${this.C_RESET}`);
            }
            else {
                s.tabs.slice(0, 4).forEach((t, tabIdx) => {
                    renderedTabs++;
                    const icon = this.getTabIcon(t.url, t.title);
                    const title = (t.title || 'Sin título').slice(0, 50);
                    const urlSnippet = t.url.slice(0, 45);
                    const line = `     [${s.port}-${tabIdx + 1}] ${icon} ${title} │ ${this.C_DIM}${urlSnippet}${this.C_RESET}`;
                    console.log(`${this.C_CYAN}║${this.C_RESET}${line}`.padEnd(122) + `${this.C_CYAN}║${this.C_RESET}`);
                });
                if (s.tabs.length > 4) {
                    console.log(`${this.C_CYAN}║${this.C_RESET}     ... y ${s.tabs.length - 4} pestañas más en puerto ${s.port}`.padEnd(113) + `${this.C_CYAN}║${this.C_RESET}`);
                }
            }
        });
        if (renderedTabs === 0 && state.sessions.length === 0) {
            console.log(`${this.C_CYAN}║${this.C_RESET}     (No hay pestañas para mostrar. Inicia una sesión con [a] o [m])`.padEnd(113) + `${this.C_CYAN}║${this.C_RESET}`);
        }
        console.log(`${this.C_CYAN}╠═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣${this.C_RESET}`);
        // 4. TOAST NOTIFICATIONS
        console.log(`${this.C_CYAN}║${this.C_RESET}  🔔 ${this.C_BOLD}NOTIFICACIONES Y EVENTOS DEL SISTEMA:${this.C_RESET}`.padEnd(122) + `${this.C_CYAN}║${this.C_RESET}`);
        if (state.toasts.length === 0) {
            console.log(`${this.C_CYAN}║${this.C_RESET}     [${state.lastRefresh}] ✅ Sistema listo. Todos los subsistemas operando con normalidad.`.padEnd(113) + `${this.C_CYAN}║${this.C_RESET}`);
        }
        else {
            state.toasts.slice(-3).forEach(t => {
                const levelIcon = t.level === 'error' ? '❌' : t.level === 'warn' ? '⚠️ ' : '✅';
                const msg = `     [${t.timestamp}] ${levelIcon} ${t.message}`.slice(0, 108);
                console.log(`${this.C_CYAN}║${this.C_RESET}${msg}`.padEnd(113) + `${this.C_CYAN}║${this.C_RESET}`);
            });
        }
        console.log(`${this.C_CYAN}╠═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣${this.C_RESET}`);
        // 5. CENTRO DE COMANDOS
        console.log(`${this.C_CYAN}║${this.C_RESET}  🛠️  ${this.C_BOLD}${this.C_YELLOW}CENTRO DE COMANDOS INTERACTIVOS (Presiona tecla + Enter):${this.C_RESET}`.padEnd(122) + `${this.C_CYAN}║${this.C_RESET}`);
        console.log(`${this.C_CYAN}║${this.C_RESET}                                                                                                                             ${this.C_CYAN}║${this.C_RESET}`);
        console.log(`${this.C_CYAN}║${this.C_RESET}  ${this.C_GREEN}[s]${this.C_RESET} 🔄 Reabrir / Relanzar Sesión Caída             ${this.C_CYAN}[a]${this.C_RESET} ➕ Añadir / Lanzar Nueva Sesión Paralela (Nuevo Perfil & Puerto)    ${this.C_CYAN}║${this.C_RESET}`);
        console.log(`${this.C_CYAN}║${this.C_RESET}  ${this.C_MAGENTA}[m]${this.C_RESET} 🚀 Lanzar Preset Maestro (Combo 9001 + 9002)   ${this.C_BLUE}[w]${this.C_RESET} 💼 Inyectar Workspace / Suite (Work, Social, AI, CRM)                ${this.C_CYAN}║${this.C_RESET}`);
        console.log(`${this.C_CYAN}║${this.C_RESET}  ${this.C_CYAN}[n]${this.C_RESET} 🌐 Abrir Pestaña / URL Rápida en Sesión        ${this.C_YELLOW}[c]${this.C_RESET} 📸 Capturar Screenshot en Vivo de una Sesión                         ${this.C_CYAN}║${this.C_RESET}`);
        console.log(`${this.C_CYAN}║${this.C_RESET}  ${this.C_RED}[k]${this.C_RESET} 🛑 Detener Sesión Específica (o Todas)         ${this.C_DIM}[l]${this.C_RESET} 🧹 Limpiar Bloqueos (SingletonLock) de Perfiles                      ${this.C_CYAN}║${this.C_RESET}`);
        console.log(`${this.C_CYAN}║${this.C_RESET}  ${this.C_YELLOW}[p]${this.C_RESET} 🔌 Ver Registro Completo de Puertos CDP        ${this.C_GREEN}[t]${this.C_RESET} 🛡️ Activar / Desactivar Modo Watchdog (Auto-Repair)                  ${this.C_CYAN}║${this.C_RESET}`);
        console.log(`${this.C_CYAN}║${this.C_RESET}  ${this.C_CYAN}[r]${this.C_RESET} ⚡ Refrescar Estado y Pestañas Ahora           ${this.C_RED}[q]${this.C_RESET} 🚪 Salir del Supervisor y Liberar Puertos                            ${this.C_CYAN}║${this.C_RESET}`);
        console.log(`${this.C_CYAN}╚═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝${this.C_RESET}\n`);
    }
    static getTabIcon(url, title) {
        const combined = (url + ' ' + title).toLowerCase();
        if (combined.includes('whatsapp'))
            return '💬';
        if (combined.includes('mail.google') || combined.includes('gmail'))
            return '✉️ ';
        if (combined.includes('instagram'))
            return '📸';
        if (combined.includes('facebook'))
            return '👥';
        if (combined.includes('tiktok'))
            return '🎵';
        if (combined.includes('gemini') || combined.includes('claude') || combined.includes('chatgpt'))
            return '🤖';
        if (combined.includes('crm') || combined.includes('lead'))
            return '📊';
        if (combined.includes('fairdraw'))
            return '💎';
        return '🌐';
    }
}
exports.MasterDashboard = MasterDashboard;
// ANSI Color Tokens
MasterDashboard.C_RESET = '\x1b[0m';
MasterDashboard.C_BOLD = '\x1b[1m';
MasterDashboard.C_CYAN = '\x1b[1;36m';
MasterDashboard.C_MAGENTA = '\x1b[1;35m';
MasterDashboard.C_GREEN = '\x1b[1;32m';
MasterDashboard.C_YELLOW = '\x1b[1;33m';
MasterDashboard.C_RED = '\x1b[1;31m';
MasterDashboard.C_BLUE = '\x1b[1;94m';
MasterDashboard.C_DIM = '\x1b[2m';
// Badges
MasterDashboard.BADGE_ONLINE = '\x1b[1;42;37m 🟢 ACTIVO \x1b[0m';
MasterDashboard.BADGE_OFFLINE = '\x1b[1;41;37m 🔴 OFFLINE \x1b[0m';
MasterDashboard.BADGE_RECONNECT = '\x1b[1;43;30m 🟡 RECONECTANDO \x1b[0m';
MasterDashboard.BADGE_WATCHDOG_ON = '\x1b[1;42;37m 🛡️ ACTIVO \x1b[0m';
MasterDashboard.BADGE_WATCHDOG_OFF = '\x1b[1;40;37m ⚪ INACTIVO \x1b[0m';
//# sourceMappingURL=MasterDashboard.js.map