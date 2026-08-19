import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ActiveSession {
  port: number;
  browser: string;
  profileDir: string;
  profileName: string;
  userDataDir: string;
  pid?: number;
  project?: string;
  startedAt: string;
  wsUrl?: string;
}

const SESSIONS_DIR = path.join(os.homedir(), '.hyperion');
const SESSIONS_FILE = path.join(SESSIONS_DIR, 'active_sessions.json');

export class PortSessionManager {
  /**
   * Ensures the storage directory exists
   */
  private static ensureDir(): void {
    if (!fs.existsSync(SESSIONS_DIR)) {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }
  }

  /**
   * Reads all registered sessions and purges inactive/dead ones
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

    // Verify which ports are truly alive via HTTP probe
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
   * Probes if a given port is actively listening for CDP commands
   */
  static isPortInUse(port: number, host = '127.0.0.1', timeoutMs = 800): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`http://${host}:${port}/json/version`, { timeout: timeoutMs }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(!!parsed.Browser || !!parsed.webSocketDebuggerUrl);
          } catch {
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

  /**
   * Checks if a profile is currently in use by any active session
   */
  static async isProfileLocked(userDataDir: string, profileDir: string): Promise<ActiveSession | null> {
    const activeSessions = await this.getActiveSessions();
    const match = activeSessions.find(s => 
      s.userDataDir.toLowerCase() === userDataDir.toLowerCase() &&
      s.profileDir.toLowerCase() === profileDir.toLowerCase()
    );
    return match || null;
  }
}
