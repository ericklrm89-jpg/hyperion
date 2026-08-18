import { ConnectionManager } from '../connection';
export interface ExtractedTable {
    headers: string[];
    rows: Record<string, string>[];
    caption?: string;
}
export declare class TableExtractor {
    private cxn;
    constructor(cxn: ConnectionManager);
    extract(selector?: string): Promise<ExtractedTable[]>;
}
//# sourceMappingURL=extractTable.d.ts.map