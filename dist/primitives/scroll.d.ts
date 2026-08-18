import { ConnectionManager } from '../connection';
export interface ScrollOptions {
    selector?: string;
    deltaX?: number;
    deltaY?: number;
    toTop?: boolean;
    toBottom?: boolean;
    startX?: number;
    startY?: number;
    block?: 'start' | 'center' | 'end' | 'nearest';
}
export declare class ScrollPrimitive {
    private cxn;
    constructor(cxn: ConnectionManager);
    scroll(options: ScrollOptions): Promise<void>;
    private scrollIntoView;
    private scrollBy;
    private scrollToTop;
    private scrollToBottom;
    scrollInfinite(stopSelector?: string, maxScrolls?: number, scrollDelay?: number): Promise<void>;
}
//# sourceMappingURL=scroll.d.ts.map