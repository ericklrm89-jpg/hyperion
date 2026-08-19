import { Hyperion } from '../hyperion';
import { OverlayState } from '../core/types';
/**
 * Overlay Engine - Robust element mapping with guaranteed single injection
 */
export declare class OverlayEngine {
    private state;
    /**
     * Ensure overlay is injected (ONLY ONCE)
     */
    ensureInjected(hyperion: Hyperion, options?: {
        refreshIntervalMs: number;
    }): Promise<OverlayState>;
    /**
     * Generate overlay injection script
     */
    private generateInjectionScript;
    /**
     * Kill overlay
     */
    kill(hyperion: Hyperion): Promise<void>;
    /**
     * Get overlay elements
     */
    getElements(hyperion: Hyperion): Promise<any[]>;
    /**
     * Click by overlay ID
     */
    clickById(hyperion: Hyperion, overlayId: number): Promise<boolean>;
    /**
     * Get state
     */
    getState(): OverlayState;
}
//# sourceMappingURL=OverlayEngine.d.ts.map