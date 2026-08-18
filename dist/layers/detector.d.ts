import { ConnectionManager } from '../connection';
export interface DetectionResult {
    name: string;
    dialog: {
        x: number;
        y: number;
        w: number;
        h: number;
    } | null;
    layers: string[];
}
/**
 * LayerDetector identifies which UI layer is active on the page
 * using elementsFromPoint at key positions.
 *
 * Layers detected:
 * - "dialog"  : modal/popup overlay (role="dialog")
 * - "sidebar" : persistent navigation sidebar (left)
 * - "content" : main content area
 * - "bottom"  : bottom navigation bar (mobile)
 * - "unknown" : could not determine
 */
export declare class LayerDetector {
    private cxn;
    constructor(cxn: ConnectionManager);
    detect(): Promise<DetectionResult>;
    /**
     * Filter elements to only those within the active dialog (if one exists).
     * Falls back to viewport elements if no dialog.
     */
    filterActiveLayer(elements: Array<{
        x: number;
        y: number;
    }>): Promise<Array<{
        x: number;
        y: number;
    }>>;
}
//# sourceMappingURL=detector.d.ts.map