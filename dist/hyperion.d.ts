import { ConnectionManager } from './connection';
import { HyperionConfig } from './config';
import { ClickPrimitive, TypePrimitive, ScreenshotPrimitive, NavigatePrimitive, ScrollPrimitive, SelectPrimitive, UploadPrimitive, DialogPrimitive, OverlayPrimitive } from './primitives';
export declare class Hyperion {
    cxn: ConnectionManager;
    click: ClickPrimitive;
    type: TypePrimitive;
    screenshot: ScreenshotPrimitive;
    navigate: NavigatePrimitive;
    scroll: ScrollPrimitive;
    select: SelectPrimitive;
    upload: UploadPrimitive;
    dialog: DialogPrimitive;
    overlay: OverlayPrimitive;
    private config;
    constructor(config?: Partial<HyperionConfig>);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    eval(expression: string): Promise<any>;
    call(method: string, params?: any): Promise<any>;
    getPageText(): Promise<string>;
    getPageTitle(): Promise<string>;
    getPageURL(): Promise<string>;
}
//# sourceMappingURL=hyperion.d.ts.map