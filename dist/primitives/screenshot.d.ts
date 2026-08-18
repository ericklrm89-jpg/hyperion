import { ConnectionManager } from '../connection';
export type ScreenshotMode = 'viewport' | 'fullPage' | 'element';
export type ScreenshotFormat = 'png' | 'jpeg' | 'webp';
export interface ScreenshotOptions {
    format?: ScreenshotFormat;
    quality?: number;
    mode?: ScreenshotMode;
    selector?: string;
    clip?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    fromSurface?: boolean;
    optimizeForSpeed?: boolean;
}
export declare class ScreenshotPrimitive {
    private cxn;
    constructor(cxn: ConnectionManager);
    capture(options?: ScreenshotOptions): Promise<Buffer>;
    private captureFullPage;
    private captureElement;
    compare(actual: Buffer, expected: Buffer, threshold?: number): Promise<{
        diff: number;
        diffPixels: number;
    }>;
}
//# sourceMappingURL=screenshot.d.ts.map