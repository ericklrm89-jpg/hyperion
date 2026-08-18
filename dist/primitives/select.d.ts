import { ConnectionManager } from '../connection';
export declare class SelectPrimitive {
    private cxn;
    constructor(cxn: ConnectionManager);
    selectOption(selector: string, value: string | string[]): Promise<void>;
    getOptions(selector: string): Promise<{
        value: string;
        text: string;
    }[]>;
}
//# sourceMappingURL=select.d.ts.map