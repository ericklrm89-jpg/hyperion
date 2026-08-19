import { ConnectionManager } from '../connection';
export interface StealthOptions {
    runtimeEnable?: boolean;
    automationOverride?: boolean;
    focusEmulation?: boolean;
    zeroJSPatches?: boolean;
    userAgent?: string;
    locale?: string;
    timezone?: string;
    geolocation?: {
        latitude: number;
        longitude: number;
        accuracy: number;
    };
}
/**
 * Native CDP & Prototype Stealth Evasion Module
 * Eliminates automated fingerprints (navigator.webdriver, chrome runtime shim, permissions, viewport)
 */
export declare class AntiDetection {
    private cxn;
    constructor(cxn: ConnectionManager);
    apply(options: StealthOptions): Promise<void>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=anti-detection.d.ts.map