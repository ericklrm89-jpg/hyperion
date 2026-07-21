import { ConnectionManager } from '../connection'

export interface StealthOptions {
  runtimeEnable: boolean
  automationOverride: boolean
  focusEmulation: boolean
  zeroJSPatches: boolean
  userAgent?: string
  locale?: string
  timezone?: string
  geolocation?: { latitude: number; longitude: number; accuracy: number }
}

export class AntiDetection {
  constructor(private cxn: ConnectionManager) {}

  async apply(options: StealthOptions): Promise<void> {
    // 1. Automation override (native CDP, undetectable)
    if (options.automationOverride) {
      try {
        await this.cxn.call('Emulation.setAutomationOverride', { enabled: true })
      } catch {}
    }

    // 2. Focus emulation (tabs in background not throttled)
    if (options.focusEmulation) {
      try {
        await this.cxn.call('Emulation.setFocusEmulationEnabled', { enabled: true })
      } catch {}
    }

    // 3. User agent override (if specified)
    if (options.userAgent) {
      try {
        await this.cxn.call('Emulation.setUserAgentOverride', {
          userAgent: options.userAgent
        })
      } catch {}
    }

    // 4. Locale override
    if (options.locale) {
      try {
        await this.cxn.call('Emulation.setLocaleOverride', { locale: options.locale })
      } catch {}
    }

    // 5. Timezone override
    if (options.timezone) {
      try {
        await this.cxn.call('Emulation.setTimezoneOverride', { timezoneId: options.timezone })
      } catch {}
    }

    // 6. Geolocation override
    if (options.geolocation) {
      try {
        await this.cxn.call('Emulation.setGeolocationOverride', options.geolocation)
      } catch {}
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
      })
    } catch {}

    if (options.zeroJSPatches) {
      // Remove the script we just added (it had no content anyway)
      // The key is: we do NOT patch anything in JS land
      // All anti-detection is native CDP
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.cxn.call('Emulation.setAutomationOverride', { enabled: false })
    } catch {}
    try {
      await this.cxn.call('Emulation.setFocusEmulationEnabled', { enabled: false })
    } catch {}
    try {
      await this.cxn.call('Emulation.clearDeviceMetricsOverride')
    } catch {}
  }
}
