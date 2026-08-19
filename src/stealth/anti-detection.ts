import { ConnectionManager } from '../connection'
import { logger } from '../core/logger'

export interface StealthOptions {
  runtimeEnable?: boolean
  automationOverride?: boolean
  focusEmulation?: boolean
  zeroJSPatches?: boolean
  userAgent?: string
  locale?: string
  timezone?: string
  geolocation?: { latitude: number; longitude: number; accuracy: number }
}

/**
 * Native CDP & Prototype Stealth Evasion Module
 * Eliminates automated fingerprints (navigator.webdriver, chrome runtime shim, permissions, viewport)
 */
export class AntiDetection {
  constructor(private cxn: ConnectionManager) {}

  async apply(options: StealthOptions): Promise<void> {
    // 1. Focus emulation (tabs in background not throttled)
    if (options.focusEmulation) {
      try {
        await this.cxn.call('Emulation.setFocusEmulationEnabled', { enabled: true })
      } catch (err) {
        logger.debug({ err }, 'stealth: focusEmulation failed')
      }
    }

    // 2. User agent override (if specified)
    if (options.userAgent) {
      try {
        await this.cxn.call('Emulation.setUserAgentOverride', {
          userAgent: options.userAgent
        })
      } catch (err) {
        logger.debug({ err }, 'stealth: userAgent failed')
      }
    }

    // 3. Locale override
    if (options.locale) {
      try {
        await this.cxn.call('Emulation.setLocaleOverride', { locale: options.locale })
      } catch (err) {
        logger.debug({ err }, 'stealth: locale failed')
      }
    }

    // 4. Timezone override
    if (options.timezone) {
      try {
        await this.cxn.call('Emulation.setTimezoneOverride', { timezoneId: options.timezone })
      } catch (err) {
        logger.debug({ err }, 'stealth: timezone failed')
      }
    }

    // 5. Geolocation override
    if (options.geolocation) {
      try {
        await this.cxn.call('Emulation.setGeolocationOverride', options.geolocation)
      } catch (err) {
        logger.debug({ err }, 'stealth: geolocation failed')
      }
    }

    // 6. Native JS Prototype Evasions on new document creation
    if (!options.zeroJSPatches) {
      try {
        await this.cxn.call('Page.addScriptToEvaluateOnNewDocument', {
          source: `
            // 1. Mask navigator.webdriver
            Object.defineProperty(navigator, 'webdriver', {
              get: () => undefined,
              configurable: true
            });

            // 2. Mock Chrome runtime object
            if (!window.chrome) {
              window.chrome = {
                runtime: {},
                loadTimes: function() {},
                csi: function() {},
                app: {}
              };
            }

            // 3. Mock permissions query for notification state
            if (navigator.permissions && navigator.permissions.query) {
              const originalQuery = navigator.permissions.query;
              navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                  Promise.resolve({ state: Notification.permission }) :
                  originalQuery(parameters)
              );
            }

            // 4. Mock plugins length
            if (!navigator.plugins || navigator.plugins.length === 0) {
              Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
                configurable: true
              });
            }
          `
        })
      } catch (err) {
        logger.debug({ err }, 'stealth: Page.addScriptToEvaluateOnNewDocument failed')
      }
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.cxn.call('Emulation.setFocusEmulationEnabled', { enabled: false })
    } catch (err) {
      logger.debug({ err }, 'stealth cleanup: focusEmulation failed')
    }
    try {
      await this.cxn.call('Emulation.clearDeviceMetricsOverride')
    } catch (err) {
      logger.debug({ err }, 'stealth cleanup: clearDeviceMetricsOverride failed')
    }
  }
}
