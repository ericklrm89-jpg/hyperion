"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AntiDetection = void 0;
const logger_1 = require("../core/logger");
class AntiDetection {
    constructor(cxn) {
        this.cxn = cxn;
    }
    async apply(options) {
        // 1. Automation override (native CDP, undetectable)
        if (options.automationOverride) {
            try {
                await this.cxn.call('Emulation.setAutomationOverride', { enabled: true });
            }
            catch (err) {
                logger_1.logger.debug({ err }, 'stealth override failed (automationOverride)');
            }
        }
        // 2. Focus emulation (tabs in background not throttled)
        if (options.focusEmulation) {
            try {
                await this.cxn.call('Emulation.setFocusEmulationEnabled', { enabled: true });
            }
            catch (err) {
                logger_1.logger.debug({ err }, 'stealth override failed (focusEmulation)');
            }
        }
        // 3. User agent override (if specified)
        if (options.userAgent) {
            try {
                await this.cxn.call('Emulation.setUserAgentOverride', {
                    userAgent: options.userAgent
                });
            }
            catch (err) {
                logger_1.logger.debug({ err }, 'stealth override failed (userAgent)');
            }
        }
        // 4. Locale override
        if (options.locale) {
            try {
                await this.cxn.call('Emulation.setLocaleOverride', { locale: options.locale });
            }
            catch (err) {
                logger_1.logger.debug({ err }, 'stealth override failed (locale)');
            }
        }
        // 5. Timezone override
        if (options.timezone) {
            try {
                await this.cxn.call('Emulation.setTimezoneOverride', { timezoneId: options.timezone });
            }
            catch (err) {
                logger_1.logger.debug({ err }, 'stealth override failed (timezone)');
            }
        }
        // 6. Geolocation override
        if (options.geolocation) {
            try {
                await this.cxn.call('Emulation.setGeolocationOverride', options.geolocation);
            }
            catch (err) {
                logger_1.logger.debug({ err }, 'stealth override failed (geolocation)');
            }
        }
        // 7. Runtime.enable is intentionally NOT called
        // This avoids the runtime leak detectable by CreepJS/rebrowser
        // 8. Zero JS patches: no addScriptToEvaluateOnNewDocument
        // No window[name] modifications, no getter overrides
        // Chrome native overrides only (Emulation.*)
        // 9. Disable automation-controlled features
        try {
            await this.cxn.call('Page.addScriptToEvaluateOnNewDocument', {
                source: `
          // Minimal: override only what's necessary
          // navigator.webdriver is handled by Emulation.setAutomationOverride
          // No other modifications
        `
            });
        }
        catch (err) {
            logger_1.logger.debug({ err }, 'stealth override failed (addScriptToEvaluateOnNewDocument)');
        }
        if (options.zeroJSPatches) {
            // Remove the script we just added (it had no content anyway)
            // The key is: we do NOT patch anything in JS land
            // All anti-detection is native CDP
        }
    }
    async cleanup() {
        try {
            await this.cxn.call('Emulation.setAutomationOverride', { enabled: false });
        }
        catch (err) {
            logger_1.logger.debug({ err }, 'stealth cleanup failed (automationOverride)');
        }
        try {
            await this.cxn.call('Emulation.setFocusEmulationEnabled', { enabled: false });
        }
        catch (err) {
            logger_1.logger.debug({ err }, 'stealth cleanup failed (focusEmulation)');
        }
        try {
            await this.cxn.call('Emulation.clearDeviceMetricsOverride');
        }
        catch (err) {
            logger_1.logger.debug({ err }, 'stealth cleanup failed (clearDeviceMetricsOverride)');
        }
    }
}
exports.AntiDetection = AntiDetection;
//# sourceMappingURL=anti-detection.js.map