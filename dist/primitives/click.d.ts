import { ConnectionManager } from '../connection';
export interface ClickOptions {
    button?: 'left' | 'middle' | 'right';
    clickCount?: number;
    delay?: number;
    modifiers?: number;
    retries?: number;
    scrollIntoView?: boolean;
    strategy?: 'cdp-first' | 'js-first' | 'js-only';
    fastJS?: boolean;
}
export declare class ClickPrimitive {
    private cxn;
    constructor(cxn: ConnectionManager);
    /**
     * Performs dual-tier robust click with automatic fallback between CDP and JS synthetic events
     */
    click(selector: string, options?: ClickOptions): Promise<boolean>;
    /**
     * Dual-Tier JavaScript Click: Complete synthetic event chain + Native .click()
     * Dispatches PointerEvents, MouseEvents, .focus({ preventScroll: true }) and .click()
     */
    clickJS(selector: string): Promise<boolean>;
    clickAt(x: number, y: number, options?: ClickOptions): Promise<void>;
    hover(selector: string): Promise<void>;
    rightClick(selector: string): Promise<void>;
    doubleClick(selector: string): Promise<void>;
    private getElementCoords;
    private detectOverlay;
    private dismissOverlay;
}
//# sourceMappingURL=click.d.ts.map