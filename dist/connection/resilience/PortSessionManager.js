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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const SESSIONS_DIR = path.join(os.homedir(), '.hyperion');
const SESSIONS_FILE = path.join(SESSIONS_DIR, 'active_sessions.json');
class PortSessionManager {
    /**
     * Ensures the storage directory exists
     */
    static ensureDir() {
        if (!fs.existsSync(SESSIONS_DIR)) {
            fs.mkdirSync(SESSIONS_DIR, { recursive: true });
        }
    }
    /**
     * Reads all registered sessions and purges inactive/dead ones
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
        // Verify which ports are truly alive via HTTP probe
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
     * Probes if a given port is actively listening for CDP commands
     */
    static isPortInUse(port, host = '127.0.0.1', timeoutMs = 800) {
        return new Promise((resolve) => {
            const req = http.get(`http://${host}:${port}/json/version`, { timeout: timeoutMs }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(!!parsed.Browser || !!parsed.webSocketDebuggerUrl);
                    }
                    catch {
                        resolve(false);
                    }
                });
            });
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            req.on('error', () => {
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
        for (let p = startPort; p <= maxPort; p++) {
            const inUse = await this.isPortInUse(p);
            if (!inUse) {
                return p;
            }
        }
        throw new Error(`No free CDP ports available in range ${startPort}..${maxPort}`);
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
    /**
     * Checks if a profile is currently in use by any active session
     */
    static async isProfileLocked(userDataDir, profileDir) {
        const activeSessions = await this.getActiveSessions();
        const match = activeSessions.find(s => s.userDataDir.toLowerCase() === userDataDir.toLowerCase() &&
            s.profileDir.toLowerCase() === profileDir.toLowerCase());
        return match || null;
    }
}
exports.PortSessionManager = PortSessionManager;
//# sourceMappingURL=PortSessionManager.js.map