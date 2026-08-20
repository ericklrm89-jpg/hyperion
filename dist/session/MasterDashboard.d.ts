/**
 * HYPERION MASTER DASHBOARD RENDERER
 * Ultra-aesthetic Cyberpunk/Clean Enterprise terminal UI engine with dual-matrix view,
 * real-time tab stream, latency metrics, and toast notifications.
 */
import { DashboardViewState } from './types';
export declare class MasterDashboard {
    private static C_RESET;
    private static C_BOLD;
    private static C_CYAN;
    private static C_MAGENTA;
    private static C_GREEN;
    private static C_YELLOW;
    private static C_RED;
    private static C_BLUE;
    private static C_DIM;
    private static BADGE_WATCHDOG_ON;
    private static BADGE_WATCHDOG_OFF;
    /**
     * Renders the complete, self-refreshing Master Control Center UI
     */
    static render(state: DashboardViewState): void;
    private static getTabIcon;
}
//# sourceMappingURL=MasterDashboard.d.ts.map