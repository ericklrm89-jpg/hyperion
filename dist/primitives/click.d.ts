import { ConnectionManager } from '../connection';
export interface ClickOptions {
    button?: 'left' | 'middle' | 'right';
    clickCount?: number;
    delay?: number;
    modifiers?: number;
    retries?: number;
    scrollIntoView?: boolean;
}
export declare class ClickPrimitive {
    private cxn;
    constructor(cxn: ConnectionManager);
    click(selector: string, options?: ClickOptions): Promise<boolean>;
    clickAt(x: number, y: number, options?: ClickOptions): Promise<void>;
    hover(selector: string): Promise<void>;
    rightClick(selector: string): Promise<void>;
    doubleClick(selector: string): Promise<void>;
    private getElementCoords;
    private detectOverlay;
    private dismissOverlay;
}
//# sourceMappingURL=click.d.ts.map