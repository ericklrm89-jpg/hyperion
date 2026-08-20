/**
 * HYPERION PROFILE MANAGER
 * Discovers browser profiles, sanitizes locks, and clones isolated profiles for multi-session support.
 */
import { ProfileMetadata } from './types';
export declare class ProfileManager {
    /**
     * Scans all installed browsers (Chrome, Edge, Brave) and their profiles
     */
    static scanProfiles(): ProfileMetadata[];
    /**
     * Sanitizes Chrome/Edge lockfiles to prevent ECONNREFUSED or crashed launch
     */
    static cleanLocks(userDataDir: string): void;
    /**
     * Safely clones cookies, preferences, and session tokens to an isolated directory for parallel instances
     */
    static seedProfileIfNew(sourceUserDataDir: string, profileDir: string, targetUserDataDir: string): void;
    /**
     * Saves the last selected profile for smart recommendations
     */
    static saveLastProfile(profile: ProfileMetadata): void;
    /**
     * Loads the last selected profile
     */
    static loadLastProfile(): ProfileMetadata | null;
}
//# sourceMappingURL=ProfileManager.d.ts.map