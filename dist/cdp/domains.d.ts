export declare enum Domain {
    Page = "Page",
    DOM = "DOM",
    Runtime = "Runtime",
    Input = "Input",
    Network = "Network",
    Accessibility = "Accessibility",
    Overlay = "Overlay",
    Security = "Security",
    Emulation = "Emulation",
    Target = "Target",
    CSS = "CSS"
}
export declare const DOMAIN_METHODS: Record<Domain, string[]>;
export interface DomainState {
    enabled: boolean;
    eventListeners: Map<string, Set<(...args: any[]) => void>>;
}
export declare const DOMAIN_INIT_ORDER: {
    domain: Domain;
    required: boolean;
    stealthSafe: boolean;
}[];
//# sourceMappingURL=domains.d.ts.map