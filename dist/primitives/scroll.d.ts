import { ConnectionManager } from '../connection';
export interface ScrollOptions {
    selector?: string;
    panel?: 'sidebar' | 'feed' | 'chat' | 'modal' | 'left' | 'right' | 'main' | string;
    deltaX?: number;
    deltaY?: number;
    toTop?: boolean;
    toBottom?: boolean;
    startX?: number;
    startY?: number;
    block?: 'start' | 'center' | 'end' | 'nearest';
}
export interface ScrollablePanel {
    id?: string;
    className?: string;
    tag: string;
    role?: string | null;
    rect: {
        left: number;
        top: number;
        width: number;
        height: number;
    };
    scrollHeight: number;
    clientHeight: number;
    scrollWidth: number;
    clientWidth: number;
    isMainPage: boolean;
}
export declare class ScrollPrimitive {
    private cxn;
    constructor(cxn: ConnectionManager);
    /**
     * Universal Smart Scroll across sub-panels, modals, sidebars, and feeds
     */
    scroll(options: ScrollOptions): Promise<void>;
    /**
     * Detects all active scrollable containers and panels currently visible in the DOM
     */
    detectScrollablePanels(): Promise<ScrollablePanel[]>;
    /**
     * Scrolls a specific sub-panel by semantic name or selector
     */
    scrollPanel(panelNameOrSelector: string, deltaY?: number, deltaX?: number): Promise<void>;
    private scrollIntoView;
    private scrollBy;
    private scrollToTop;
    private scrollToBottom;
    scrollInfinite(stopSelector?: string, maxScrolls?: number, scrollDelay?: number): Promise<void>;
}
//# sourceMappingURL=scroll.d.ts.map