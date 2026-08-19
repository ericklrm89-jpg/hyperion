import { EventEmitter } from 'events';
import { Hyperion } from '../hyperion';
import { VisionFrame } from '../core/types';
/**
 * Real-Time Vision Engine
 * Captures frames, detects changes, streams to LLM
 */
export declare class VisionEngine extends EventEmitter {
    private hyperion;
    private frameBuffer;
    private streaming;
    private lastFrame?;
    private platformDetector;
    private maxFrames;
    constructor(hyperion: Hyperion);
    /**
     * Start streaming vision frames
     */
    startStreaming(intervalMs?: number, maxFrames?: number): Promise<void>;
    /**
     * Stop streaming
     */
    stopStreaming(): void;
    /**
     * Capture single frame with full element detection
     */
    private captureFrame;
    /**
     * Detect DOM changes between frames
     */
    private detectChanges;
    /**
     * Get latest frame
     */
    getLatestFrame(): VisionFrame | null;
    /**
     * Get frame history
     */
    getFrameHistory(count?: number): VisionFrame[];
    /**
     * Search frames by platform
     */
    getFramesByPlatform(platform: string): VisionFrame[];
    /**
     * Get stats
     */
    getStats(): {
        totalFrames: number;
        isStreaming: boolean;
        lastFrameAt: number;
        totalElements: number;
        lastPlatform: string;
    };
}
//# sourceMappingURL=VisionEngine.d.ts.map