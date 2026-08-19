import * as http from 'http';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ActiveSession {
  port: number;
  browser: string;
  profileDir: string;
  profileName: string;
  userDataDir: string;
  isolatedDataDir?: string;
  pid?: number;
  project?: string;
  startedAt: string;
  wsUrl?: string;
}

const SESSIONS_DIR = path.join(os.homedir(), '.hyperion');
const SESSIONS_FILE = path.join(SESSIONS_DIR, 'active_sessions.json');
const ISOLATED_PROFILES_DIR = path.join(SESSIONS_DIR, 'profiles');

export class PortSessionManager {
  /**
   * Ensures the storage directories exist
   */
  private static ensureDir(): void {
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
  static async getActiveSessions(): Promise<ActiveSession[]> {
    this.ensureDir();
    let sessions: ActiveSession[] = [];

    if (fs.existsSync(SESSIONS_FILE)) {
      try {
        sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
      } catch {
        sessions = [];
      }
    }

    // Verify which ports are truly alive via instant TCP probe
    const verifiedSessions: ActiveSession[] = [];
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
  private static saveSessions(sessions: ActiveSession[]): void {
    this.ensureDir();
    try {
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    } catch {}
  }

  /**
   * Instant OS-level TCP socket check (50ms) to detect if a port is listening
   */
  static isPortInUse(port: number, host = '127.0.0.1', timeoutMs = 200): Promise<boolean> {
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
  static getCdpInfo(port: number, host = '127.0.0.1'): Promise<{ browser?: string; wsUrl?: string } | null> {
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
          } catch {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  }

  /**
   * Finds the next free port starting from startPort (e.g. 9222, 9223, 9224...)
   */
  static async findNextAvailablePort(startPort = 9222, maxPort = 9250): Promise<number> {
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
  static getIsolatedUserDataDir(browserName: string, profileDir: string): string {
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
  static async registerSession(session: ActiveSession): Promise<void> {
    const sessions = await this.getActiveSessions();
    const existingIdx = sessions.findIndex(s => s.port === session.port);

    if (existingIdx >= 0) {
      sessions[existingIdx] = session;
    } else {
      sessions.push(session);
    }

    this.saveSessions(sessions);
  }

  /**
   * Releases an active session by port
   */
  static async releaseSession(port: number): Promise<void> {
    const sessions = await this.getActiveSessions();
    const filtered = sessions.filter(s => s.port !== port);
    this.saveSessions(filtered);
  }
}
