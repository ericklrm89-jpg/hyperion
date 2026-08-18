import { ConnectionManager } from '../connection';
export interface ExtractedJSONLD {
    jsonld: any[];
    microdata: any[];
    opengraph: Record<string, string>;
    twitter: Record<string, string>;
    meta: Record<string, string>;
}
export declare class JSONLDExtractor {
    private cxn;
    constructor(cxn: ConnectionManager);
    extract(): Promise<ExtractedJSONLD>;
}
//# sourceMappingURL=extractJSONLD.d.ts.map