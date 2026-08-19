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
export declare class PortSessionManager {
    /**
     * Ensures the storage directories exist
     */
    private static ensureDir;
    /**
     * Reads all registered sessions and purges inactive/dead ones via fast TCP check
     */
    static getActiveSessions(): Promise<ActiveSession[]>;
    /**
     * Saves sessions list to disk
     */
    private static saveSessions;
    /**
     * Instant OS-level TCP socket check (50ms) to detect if a port is listening
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
     * Creates an isolated User Data directory for a profile to allow TRUE parallel Chrome processes
     */
    static getIsolatedUserDataDir(browserName: string, profileDir: string): string;
    /**
     * Registers an active session
     */
    static registerSession(session: ActiveSession): Promise<void>;
    /**
     * Releases an active session by port
     */
    static releaseSession(port: number): Promise<void>;
}
//# sourceMappingURL=PortSessionManager.d.ts.map