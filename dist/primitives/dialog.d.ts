import { ConnectionManager } from '../connection';
export type DialogAction = 'accept' | 'dismiss';
export declare class DialogPrimitive {
    private cxn;
    constructor(cxn: ConnectionManager);
    handleDialog(action: DialogAction, promptText?: string): Promise<void>;
    waitForDialog(action: DialogAction, promptText?: string, timeout?: number): Promise<void>;
}
//# sourceMappingURL=dialog.d.ts.map