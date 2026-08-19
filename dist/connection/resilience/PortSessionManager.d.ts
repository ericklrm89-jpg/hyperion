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
export declare class PortSessionManager {
    /**
     * Ensures the storage directory exists
     */
    private static ensureDir;
    /**
     * Reads all registered sessions and purges inactive/dead ones
     */
    static getActiveSessions(): Promise<ActiveSession[]>;
    /**
     * Saves sessions list to disk
     */
    private static saveSessions;
    /**
     * Probes if a given port is actively listening for CDP commands
     */
    static isPortInUse(port: number, host?: string, timeoutMs?: number): Promise<boolean>;
    /**
     * Queries CDP endpoint info on a port
     */
    static getCdpInfo(port: number, host?: string): Promise<{
        browser?: string;
        wsUrl?: string;
    } | null>;
    /**
     * Finds the next free port starting from startPort (e.g. 9222, 9223, 9224...)
     */
    static findNextAvailablePort(startPort?: number, maxPort?: number): Promise<number>;
    /**
     * Registers an active session
     */
    static registerSession(session: ActiveSession): Promise<void>;
    /**
     * Releases an active session by port
     */
    static releaseSession(port: number): Promise<void>;
    /**
     * Checks if a profile is currently in use by any active session
     */
    static isProfileLocked(userDataDir: string, profileDir: string): Promise<ActiveSession | null>;
}
//# sourceMappingURL=PortSessionManager.d.ts.map