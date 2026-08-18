import { ConnectionManager } from '../connection';
export interface TypeOptions {
    humanLike?: boolean;
    pasteThreshold?: number;
    errorRate?: number;
    delayMin?: number;
    delayMax?: number;
    clearField?: boolean;
}
export declare class TypePrimitive {
    private cxn;
    constructor(cxn: ConnectionManager);
    type(selector: string, text: string, options?: TypeOptions): Promise<void>;
    private detectInputType;
    private focusElement;
    private clearField;
    private humanLikeType;
    private typeChar;
    private pasteText;
    private pressBackspace;
    private typeCodeMirror;
    private getKeyDefinition;
    private pickRandomChar;
    private randomDelay;
}
//# sourceMappingURL=type.d.ts.map