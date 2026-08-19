export interface DiscoveredProfile {
    browser: string;
    exe: string;
    userDataDir: string;
    profileDir: string;
    name: string;
    userName: string;
    activeTime: number;
    isDefault: boolean;
}
export declare class ProfileScanner {
    static scanAllProfiles(): DiscoveredProfile[];
}
//# sourceMappingURL=ProfileScanner.d.ts.map