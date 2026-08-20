/**
 * HYPERION MULTI-SESSION ORCHESTRATOR
 * Central engine for multi-instance parallel browser lifecycle, watchdog auto-repair,
 * preset execution, workspace injection, and interactive CLI control.
 */
export declare class MultiSessionOrchestrator {
    private sessions;
    private watchdogEnabled;
    private toasts;
    private isInteractivePrompt;
    private monitorTimer;
    private rl;
    constructor();
    /**
     * Pushes a toast notification to the dashboard
     */
    private addToast;
    /**
     * Initializes and starts the master orchestrator CLI
     */
    start(): Promise<void>;
    /**
     * Initial startup wizard for user to pick single profile, preset or custom launch
     */
    private runStartupWizard;
    /**
     * Launches the dual master preset (Work 9001 + Personal 9002)
     */
    private launchMasterPreset;
    /**
     * Launches a managed browser session on a specific port
     */
    private launchSession;
    /**
     * Health monitor & watchdog continuous loop (runs every 2.5s)
     */
    private startHealthMonitor;
    /**
     * Relaunches a specific session with identical profile and port
     */
    private relaunchSession;
    /**
     * Listens and executes interactive commands from the master console
     */
    private setupCommandListener;
    private handleRelaunchPrompt;
    private handleAddSessionPrompt;
    private handleWorkspacePrompt;
    private handleNewTabPrompt;
    private handleScreenshotPrompt;
    private handleKillPrompt;
    private handleCleanLocks;
    private handleListSessionsPrompt;
    private ask;
    private shutdown;
    private setupProcessHandlers;
}
//# sourceMappingURL=MultiSessionOrchestrator.d.ts.map