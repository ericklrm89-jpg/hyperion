import { ConnectionManager } from '../connection';
import { OverlayData, OverlayConfig, OverlayElement } from './types';
/**
 * OverlayPrimitive (Capa Manus Singleton)
 * Guarantees STRICTLY ONE SINGLE OVERLAY instance in the browser at all times.
 * Automatically destroys any previous layers before starting.
 */
export declare class OverlayPrimitive {
    private cxn;
    private detector;
    private injected;
    private defaultConfig;
    constructor(cxn: ConnectionManager);
    inject(config?: OverlayConfig): Promise<void>;
    kill(keepStyles?: boolean): Promise<void>;
    ensureClean(): Promise<void>;
    getData(): Promise<OverlayData>;
    getElements(): Promise<OverlayElement[]>;
    findElementByText(text: string): Promise<OverlayElement | null>;
    findElementBySid(sid: number): Promise<OverlayElement | null>;
    clickElement(sid: number, options?: {
        button?: string;
        clickCount?: number;
    }): Promise<void>;
    getActiveLayer(): Promise<{
        name: string;
        dialog: any;
    }>;
    private buildOverlayJS;
}
//# sourceMappingURL=overlay.d.ts.map