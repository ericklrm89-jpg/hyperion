"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverlayEngine = void 0;
const logger_1 = require("../core/logger");
/**
 * Overlay Engine - Robust element mapping with guaranteed single injection
 */
class OverlayEngine {
    constructor() {
        this.state = {
            injected: false,
            elementCount: 0,
            lastRefreshAt: 0,
            lastUpdateAt: 0,
            elementMap: new Map(),
        };
    }
    /**
     * Ensure overlay is injected (ONLY ONCE)
     */
    async ensureInjected(hyperion, options = { refreshIntervalMs: 1000 }) {
        if (this.state.injected) {
            return this.state;
        }
        // Check if already injected
        const alreadyInjected = await hyperion.eval('(window.__HY_OVERLAY_READY !== undefined)');
        if (alreadyInjected?.value) {
            this.state.injected = true;
            this.state.lastRefreshAt = Date.now();
            logger_1.logger.info('[Overlay] Already injected, reusing');
            return this.state;
        }
        // Inject overlay script
        const injectionScript = this.generateInjectionScript(options.refreshIntervalMs);
        await hyperion.eval(injectionScript);
        this.state.injected = true;
        this.state.lastUpdateAt = Date.now();
        logger_1.logger.info('[Overlay] Injected successfully');
        return this.state;
    }
    /**
     * Generate overlay injection script
     */
    generateInjectionScript(refreshIntervalMs) {
        return `
      (function() {
        // Prevent double injection
        if (window.__HY_OVERLAY_READY) {
          console.log('[Overlay] Already injected, skipping');
          return;
        }
        
        // Global state
        window.__HY_OVERLAY_STATE = {
          elements: new Map(),
          intervals: [],
          observers: [],
          elementCount: 0,
          lastRefresh: 0,
        };
        
        // CSS Injection
        const style = document.createElement('style');
        style.textContent = \`
          .hy-overlay-rect {
            position: fixed;
            border: 2px solid #00ff00;
            background: rgba(0, 255, 0, 0.08);
            z-index: 999998;
            pointer-events: none;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            color: #00ff00;
            box-shadow: 0 0 4px rgba(0, 255, 0, 0.6), inset 0 0 2px rgba(0, 255, 0, 0.2);
            transition: box-shadow 0.1s ease-out;
          }
          .hy-overlay-rect:hover {
            box-shadow: 0 0 8px rgba(0, 255, 0, 1), inset 0 0 4px rgba(0, 255, 0, 0.4);
          }
          .hy-overlay-badge {
            position: absolute;
            top: -18px;
            left: 0;
            background: #00ff00;
            color: #000;
            padding: 2px 6px;
            font-weight: bold;
            font-size: 10px;
            border-radius: 3px;
            z-index: 999999;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          }
        \`;
        document.head.appendChild(style);
        
        // Main refresh function
        function refreshOverlay() {
          const now = Date.now();
          if (now - window.__HY_OVERLAY_STATE.lastRefresh < 200) return; // Debounce
          window.__HY_OVERLAY_STATE.lastRefresh = now;
          
          const selectors = 'button, a, input, textarea, select, [role="button"], [role="menuitem"], [role="tab"], [onclick]';
          const allElements = document.querySelectorAll(selectors);
          let visibleCount = 0;
          
          allElements.forEach((el, idx) => {
            const rect = el.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0 && rect.top >= -100 && rect.top <= window.innerHeight + 100;
            
            if (!isVisible) return;
            
            let overlay = window.__HY_OVERLAY_STATE.elements.get(idx);
            if (!overlay) {
              overlay = document.createElement('div');
              overlay.className = 'hy-overlay-rect';
              overlay.dataset.hyIdx = idx;
              overlay.innerHTML = '<div class="hy-overlay-badge"></div>';
              document.body.appendChild(overlay);
              window.__HY_OVERLAY_STATE.elements.set(idx, overlay);
            }
            
            overlay.style.left = rect.left + 'px';
            overlay.style.top = rect.top + 'px';
            overlay.style.width = rect.width + 'px';
            overlay.style.height = rect.height + 'px';
            overlay.querySelector('.hy-overlay-badge').textContent = visibleCount;
            
            visibleCount++;
          });
          
          // Cleanup
          for (const [idx, overlay] of window.__HY_OVERLAY_STATE.elements) {
            const els = document.querySelectorAll(selectors);
            if (!els[idx]) {
              overlay.remove();
              window.__HY_OVERLAY_STATE.elements.delete(idx);
            }
          }
          
          window.__HY_OVERLAY_STATE.elementCount = visibleCount;
        }
        
        // Initial refresh
        refreshOverlay();
        
        // Auto-refresh interval
        const interval = setInterval(refreshOverlay, ${refreshIntervalMs});
        window.__HY_OVERLAY_STATE.intervals.push(interval);
        
        // Resize listener
        window.addEventListener('resize', refreshOverlay);
        
        // MutationObserver for DOM changes
        const observer = new MutationObserver(() => refreshOverlay());
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'style', 'disabled', 'hidden', 'aria-hidden'],
        });
        window.__HY_OVERLAY_STATE.observers.push(observer);
        
        // Public API
        window.__HY_GET_OVERLAY = function() {
          const result = [];
          let visibleIdx = 0;
          document.querySelectorAll('button, a, input, [role="button"], [role="menuitem"]').forEach((el, idx) => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              result.push({
                overlayId: visibleIdx,
                elementIdx: idx,
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                w: Math.round(rect.width),
                h: Math.round(rect.height),
                text: (el.textContent || el.title || '').slice(0, 80),
                tag: el.tagName.toLowerCase(),
              });
              visibleIdx++;
            }
          });
          return result;
        };
        
        window.__HY_CLICK_OVERLAY = function(overlayId) {
          const elements = window.__HY_GET_OVERLAY();
          const target = elements.find(e => e.overlayId === overlayId);
          if (target) {
            const el = document.querySelectorAll('button, a, input, [role="button"], [role="menuitem"]')[target.elementIdx];
            if (el) {
              el.click();
              return true;
            }
          }
          return false;
        };
        
        window.__HY_OVERLAY_KILL = function() {
          window.__HY_OVERLAY_STATE.intervals.forEach(i => clearInterval(i));
          window.__HY_OVERLAY_STATE.observers.forEach(o => o.disconnect());
          window.__HY_OVERLAY_STATE.elements.forEach(el => el.remove());
          delete window.__HY_OVERLAY_STATE;
          delete window.__HY_OVERLAY_READY;
        };
        
        window.__HY_OVERLAY_READY = true;
        console.log('[Overlay] Injected and ready');
      })()
    `;
    }
    /**
     * Kill overlay
     */
    async kill(hyperion) {
        try {
            await hyperion.eval('window.__HY_OVERLAY_KILL?.()');
            logger_1.logger.info('[Overlay] Killed successfully');
        }
        catch (err) {
            logger_1.logger.warn({ err }, '[Overlay] Kill error');
        }
        this.state.injected = false;
        this.state.elementCount = 0;
        this.state.elementMap.clear();
    }
    /**
     * Get overlay elements
     */
    async getElements(hyperion) {
        if (!this.state.injected) {
            await this.ensureInjected(hyperion);
        }
        const result = await hyperion.eval('window.__HY_GET_OVERLAY?.()');
        return result?.value || [];
    }
    /**
     * Click by overlay ID
     */
    async clickById(hyperion, overlayId) {
        if (!this.state.injected) {
            throw new Error('Overlay not injected');
        }
        const result = await hyperion.eval(`window.__HY_CLICK_OVERLAY?.(${overlayId})`);
        return result?.value === true;
    }
    /**
     * Get state
     */
    getState() {
        return { ...this.state };
    }
}
exports.OverlayEngine = OverlayEngine;
//# sourceMappingURL=OverlayEngine.js.map