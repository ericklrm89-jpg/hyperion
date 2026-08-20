/**
 * HYPERION SESSION MANAGEMENT SYSTEM — TYPES & CONTRACTS
 * Strict TypeScript interfaces for multi-session orchestration, CDP metrics, and workspaces.
 */
export type BrowserType = 'Google Chrome' | 'Microsoft Edge' | 'Brave' | 'Chromium';
export declare enum HealthState {
    ONLINE = "ONLINE",
    OFFLINE = "OFFLINE",
    RECONNECTING = "RECONNECTING",
    DEGRADED = "DEGRADED"
}
export interface ProfileMetadata {
    browser: BrowserType;
    exe: string;
    userDataDir: string;
    profileDir: string;
    name: string;
    userName?: string;
    activeTime?: number;
    isDefault?: boolean;
}
export interface CdpTabInfo {
    id: string;
    title: string;
    url: string;
    type: string;
    webSocketDebuggerUrl?: string;
}
export interface ManagedSession {
    id: string;
    port: number;
    profile: ProfileMetadata;
    effectiveUserDataDir: string;
    pid?: number;
    status: HealthState;
    tabs: CdpTabInfo[];
    latencyMs: number;
    startedAt: string;
    wsUrl: string;
    lastLaunchTime?: number;
    retryCount?: number;
}
export interface WorkspacePreset {
    id: string;
    name: string;
    description: string;
    icon: string;
    urls: string[];
}
export interface MasterPreset {
    id: string;
    name: string;
    description: string;
    sessions: {
        profileDir: string;
        browserName?: string;
        port: number;
        workspaceId?: string;
    }[];
}
export interface ToastNotification {
    timestamp: string;
    level: 'info' | 'success' | 'warn' | 'error';
    message: string;
}
export interface DashboardViewState {
    sessions: ManagedSession[];
    watchdogEnabled: boolean;
    selectedSessionIndex: number;
    toasts: ToastNotification[];
    lastRefresh: string;
}
//# sourceMappingURL=types.d.ts.map