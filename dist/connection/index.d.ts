import { HyperionConfig } from '../config';
import { Transport } from './transport';
import { Domain } from '../cdp/domains';
export declare class ConnectionManager {
    transport: Transport;
    enabledDomains: Map<string, boolean>;
    private config;
    constructor(config: HyperionConfig);
    private createTransport;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    call<T = any>(method: string, params?: any): Promise<T>;
    enableDomain(domain: Domain): Promise<void>;
    initDomains(): Promise<void>;
    navigate(url: string): Promise<{
        frameId: string;
        loaderId?: string;
    }>;
    getLayoutMetrics(): Promise<{
        contentSize: {
            width: number;
            height: number;
        };
        layoutViewport: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    }>;
    getDocument(depth?: number): Promise<any>;
    querySelector(selector: string, nodeId?: number): Promise<any>;
    getBoxModel(nodeId: number): Promise<any>;
    evaluate(expression: string, options?: {
        awaitPromise?: boolean;
        returnByValue?: boolean;
        userGesture?: boolean;
    }): Promise<any>;
    callFunctionOn(functionDeclaration: string, options?: {
        objectId?: string;
        arguments?: any[];
        returnByValue?: boolean;
    }): Promise<any>;
    screenshot(options?: {
        format?: 'png' | 'jpeg' | 'webp';
        quality?: number;
        clip?: {
            x: number;
            y: number;
            width: number;
            height: number;
            scale?: number;
        };
        captureBeyondViewport?: boolean;
        fromSurface?: boolean;
    }): Promise<string>;
    dispatchMouseEvent(params: {
        type: 'mousePressed' | 'mouseReleased' | 'mouseMoved' | 'mouseWheel';
        x: number;
        y: number;
        button?: 'left' | 'middle' | 'right' | 'none';
        buttons?: number;
        clickCount?: number;
        modifiers?: number;
        deltaX?: number;
        deltaY?: number;
    }): Promise<void>;
    dispatchKeyEvent(params: {
        type: 'keyDown' | 'keyUp' | 'rawKeyDown' | 'char';
        key?: string;
        code?: string;
        text?: string;
        unmodifiedText?: string;
        windowsVirtualKeyCode?: number;
        modifiers?: number;
        autoRepeat?: boolean;
        isKeypad?: boolean;
        commands?: string[];
    }): Promise<void>;
    insertText(text: string): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): void;
    once(event: string, listener: (...args: any[]) => void): void;
    removeListener(event: string, listener: (...args: any[]) => void): void;
}
//# sourceMappingURL=index.d.ts.map