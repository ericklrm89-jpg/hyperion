/**
 * HYPERION WORKSPACE MANAGER
 * Curated workspace suites (Work, Social, AI, CRM) with batch tab injection over CDP.
 */
import { WorkspacePreset } from './types';
export declare class WorkspaceManager {
    private static predefinedWorkspaces;
    /**
     * Retrieves all available workspace presets
     */
    static getWorkspaces(): WorkspacePreset[];
    /**
     * Injects all URLs of a workspace suite into the given CDP port
     */
    static injectWorkspace(port: number, workspaceId: string): Promise<{
        success: boolean;
        openedCount: number;
    }>;
}
//# sourceMappingURL=WorkspaceManager.d.ts.map