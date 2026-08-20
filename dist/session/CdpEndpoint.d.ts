/**
 * HYPERION CDP ENDPOINT CLIENT
 * Fast, resilient HTTP/WebSocket client for Chrome DevTools Protocol inspection and tab manipulation.
 */
import { CdpTabInfo, HealthState } from './types';
export declare class CdpEndpoint {
    /**
     * Fast TCP socket ping to check if the port is actively listening
     */
    static isPortInUse(port: number, host?: string, timeoutMs?: number): Promise<boolean>;
    /**
     * Measures roundtrip latency (ping in milliseconds) to the CDP endpoint
     */
    static measurePing(port: number, host?: string): Promise<{
        alive: boolean;
        latencyMs: number;
    }>;
    /**
     * Queries the list of open page targets from http://host:port/json/list
     */
    static getTabs(port: number, host?: string, timeoutMs?: number): Promise<{
        status: HealthState;
        tabs: CdpTabInfo[];
    }>;
    /**
     * Opens a new tab with the specified URL via /json/new
     */
    static openTab(port: number, url: string, host?: string): Promise<boolean>;
    /**
     * Activates/focuses a specific tab via /json/activate/{targetId}
     */
    static activateTab(port: number, targetId: string, host?: string): Promise<boolean>;
    /**
     * Closes a specific tab via /json/close/{targetId}
     */
    static closeTab(port: number, targetId: string, host?: string): Promise<boolean>;
}
//# sourceMappingURL=CdpEndpoint.d.ts.map