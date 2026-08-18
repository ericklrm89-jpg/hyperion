import { ConnectionManager } from '../connection';
export declare class UploadPrimitive {
    private cxn;
    constructor(cxn: ConnectionManager);
    uploadFile(selector: string, filePaths: string | string[]): Promise<void>;
}
//# sourceMappingURL=upload.d.ts.map