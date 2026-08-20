/**
 * HYPERION PRESET MANAGER
 * Saves, loads, and executes master multi-session presets (e.g. Work 9001 + Social 9002).
 */
import { MasterPreset } from './types';
export declare class PresetManager {
    private static defaultPresets;
    /**
     * Retrieves all available presets (default + user saved)
     */
    static getPresets(): MasterPreset[];
    /**
     * Saves a custom user preset
     */
    static savePreset(preset: MasterPreset): void;
}
//# sourceMappingURL=PresetManager.d.ts.map