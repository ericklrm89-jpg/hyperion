"use strict";
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
exports.PortSessionManager = void 0;
const http = __importStar(require("http"));
const net = __importStar(require("net"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const SESSIONS_DIR = path.join(os.homedir(), '.hyperion');
const SESSIONS_FILE = path.join(SESSIONS_DIR, 'active_sessions.json');
const ISOLATED_PROFILES_DIR = path.join(SESSIONS_DIR, 'profiles');
class PortSessionManager {
    /**
     * Ensures the storage directories exist
     */
    static ensureDir() {
        if (!fs.existsSync(SESSIONS_DIR)) {
            fs.mkdirSync(SESSIONS_DIR, { recursive: true });
        }
        if (!fs.existsSync(ISOLATED_PROFILES_DIR)) {
            fs.mkdirSync(ISOLATED_PROFILES_DIR, { recursive: true });
        }
    }
    /**
     * Reads all registered sessions and purges inactive/dead ones via fast TCP check
     */
    static async getActiveSessions() {
        this.ensureDir();
        let sessions = [];
        if (fs.existsSync(SESSIONS_FILE)) {
            try {
                sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
            }
            catch {
                sessions = [];
            }
        }
        // Verify which ports are truly alive via instant TCP probe
        const verifiedSessions = [];
        for (const session of sessions) {
            const isAlive = await this.isPortInUse(session.port);
            if (isAlive) {
                verifiedSessions.push(session);
            }
        }
        this.saveSessions(verifiedSessions);
        return verifiedSessions;
    }
    /**
     * Saves sessions list to disk
     */
    static saveSessions(sessions) {
        this.ensureDir();
        try {
            fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
        }
        catch { }
    }
    /**
     * Instant OS-level TCP socket check (50ms) to detect if a port is listening
     */
    static isPortInUse(port, host = '127.0.0.1', timeoutMs = 200) {
        return new Promise((resolve) => {
            const socket = net.createConnection({ host, port }, () => {
                socket.destroy();
                resolve(true);
            });
            socket.on('error', () => {
                resolve(false);
            });
            socket.setTimeout(timeoutMs, () => {
                socket.destroy();
                resolve(false);
            });
        });
    }
    /**
     * Queries CDP endpoint info on a port
     */
    static getCdpInfo(port, host = '127.0.0.1') {
        return new Promise((resolve) => {
            http.get(`http://${host}:${port}/json/version`, { timeout: 1000 }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({
                            browser: parsed.Browser,
                            wsUrl: parsed.webSocketDebuggerUrl
                        });
                    }
                    catch {
                        resolve(null);
                    }
                });
            }).on('error', () => resolve(null));
        });
    }
    /**
     * Finds the next free port starting from startPort (e.g. 9222, 9223, 9224...)
     */
    static async findNextAvailablePort(startPort = 9222, maxPort = 9250) {
        const activeSessions = await this.getActiveSessions();
        const busySessionPorts = new Set(activeSessions.map(s => s.port));
        for (let p = startPort; p <= maxPort; p++) {
            const tcpBusy = await this.isPortInUse(p);
            if (!tcpBusy && !busySessionPorts.has(p)) {
                return p;
            }
        }
        throw new Error(`No free CDP ports available in range ${startPort}..${maxPort}`);
    }
    /**
     * Creates an isolated User Data directory for a profile to allow TRUE parallel Chrome processes
     */
    static getIsolatedUserDataDir(browserName, profileDir) {
        this.ensureDir();
        const cleanBrowser = browserName.replace(/[^a-zA-Z0-9]/g, '_');
        const cleanProfile = profileDir.replace(/[^a-zA-Z0-9]/g, '_');
        const dir = path.join(ISOLATED_PROFILES_DIR, `${cleanBrowser}_${cleanProfile}`);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    }
    /**
     * Registers an active session
     */
    static async registerSession(session) {
        const sessions = await this.getActiveSessions();
        const existingIdx = sessions.findIndex(s => s.port === session.port);
        if (existingIdx >= 0) {
            sessions[existingIdx] = session;
        }
        else {
            sessions.push(session);
        }
        this.saveSessions(sessions);
    }
    /**
     * Releases an active session by port
     */
    static async releaseSession(port) {
        const sessions = await this.getActiveSessions();
        const filtered = sessions.filter(s => s.port !== port);
        this.saveSessions(filtered);
    }
}
exports.PortSessionManager = PortSessionManager;
//# sourceMappingURL=PortSessionManager.js.map