export interface OverlayElement {
    sid: number;
    tag: string;
    text: string;
    x: number;
    y: number;
    w: number;
    h: number;
    isPost?: boolean;
}
export interface OverlayData {
    type: 'PAGE' | 'DIALOG';
    elements: OverlayElement[];
    activeDialog?: {
        x: number;
        y: number;
        w: number;
        h: number;
    } | null;
}
export interface OverlayConfig {
    intervalMs?: number;
    colors?: string[];
    includePostLinks?: boolean;
    gridSize?: number;
    zIndex?: number;
}
export interface Rect {
    left: number;
    top: number;
    width: number;
    height: number;
}
export interface LayerInfo {
    name: string;
    dialog: Rect | null;
    sidebar: Rect | null;
    content: Rect | null;
}
//# sourceMappingURL=types.d.ts.map