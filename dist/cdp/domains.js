"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOMAIN_INIT_ORDER = exports.DOMAIN_METHODS = exports.Domain = void 0;
var Domain;
(function (Domain) {
    Domain["Page"] = "Page";
    Domain["DOM"] = "DOM";
    Domain["Runtime"] = "Runtime";
    Domain["Input"] = "Input";
    Domain["Network"] = "Network";
    Domain["Accessibility"] = "Accessibility";
    Domain["Overlay"] = "Overlay";
    Domain["Security"] = "Security";
    Domain["Emulation"] = "Emulation";
    Domain["Target"] = "Target";
    Domain["CSS"] = "CSS";
})(Domain || (exports.Domain = Domain = {}));
exports.DOMAIN_METHODS = {
    [Domain.Page]: [
        'enable', 'navigate', 'captureScreenshot', 'captureSnapshot',
        'getLayoutMetrics', 'setLifecycleEventsEnabled', 'reload',
        'printToPDF', 'handleJavaScriptDialog', 'setInterceptFileChooserDialog',
        'addScriptToEvaluateOnNewDocument', 'getNavigationHistory',
        'navigateToHistoryEntry', 'stopLoading'
    ],
    [Domain.DOM]: [
        'enable', 'getDocument', 'querySelector', 'querySelectorAll',
        'getOuterHTML', 'requestChildNodes', 'resolveNode', 'getBoxModel',
        'setFileInputFiles', 'scrollIntoViewIfNeeded', 'getFrameOwner',
        'describeNode', 'setAttributeValue', 'removeAttribute'
    ],
    [Domain.Runtime]: [
        'enable', 'evaluate', 'callFunctionOn', 'getProperties',
        'runScript', 'compileScript', 'releaseObject'
    ],
    [Domain.Input]: [
        'dispatchMouseEvent', 'dispatchKeyEvent', 'insertText',
        'imeSetComposition', 'imeCommitComposition',
        'synthesizeScrollGesture', 'synthesizePinchGesture',
        'synthesizeTapGesture', 'setFileInputFiles'
    ],
    [Domain.Network]: [
        'enable', 'disable', 'getCookies', 'setCookie', 'deleteCookies',
        'setRequestInterception', 'setUserAgentOverride', 'getResponseBody',
        'loadingFinished', 'loadingFailed', 'responseReceived'
    ],
    [Domain.Accessibility]: [
        'enable', 'getFullAXTree', 'getPartialAXTree',
        'getChildAXNodes', 'queryAXTree'
    ],
    [Domain.Overlay]: [
        'enable', 'disable', 'setInspectMode', 'highlightNode',
        'highlightRect', 'setShowFPSCounter'
    ],
    [Domain.Security]: [
        'enable', 'setIgnoreCertificateErrors'
    ],
    [Domain.Emulation]: [
        'setDeviceMetricsOverride', 'clearDeviceMetricsOverride',
        'setUserAgentOverride', 'setGeolocationOverride',
        'setTimezoneOverride', 'setAutomationOverride',
        'setFocusEmulationEnabled', 'setScriptExecutionDisabled'
    ],
    [Domain.Target]: [
        'setDiscoverTargets', 'getTargets', 'attachToTarget',
        'createTarget', 'closeTarget', 'activateTarget',
        'setAutoAttach'
    ],
    [Domain.CSS]: [
        'enable', 'getComputedStyleForNode', 'getMatchedStylesForNode',
        'getPlatformFontsForNode', 'getInlineStylesForNode',
        'getBackgroundColors'
    ]
};
exports.DOMAIN_INIT_ORDER = [
    { domain: Domain.Page, required: true, stealthSafe: true },
    { domain: Domain.Emulation, required: false, stealthSafe: true },
    { domain: Domain.DOM, required: false, stealthSafe: true },
    { domain: Domain.Runtime, required: false, stealthSafe: false },
    { domain: Domain.Network, required: false, stealthSafe: true },
    { domain: Domain.Accessibility, required: false, stealthSafe: true },
    { domain: Domain.CSS, required: false, stealthSafe: true },
    { domain: Domain.Input, required: false, stealthSafe: true },
];
//# sourceMappingURL=domains.js.map