"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverlayEngine = void 0;
const logger_1 = require("../core/logger");
/**
 * Overlay Engine - High-contrast multicolor dynamic element mapping (Capa Manus)
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
    async ensureInjected(hyperion, options = { refreshIntervalMs: 250 }) {
        if (this.state.injected) {
            return this.state;
        }
        // Check if already injected
        const alreadyInjected = await hyperion.eval('(window.__HY_OVERLAY_READY !== undefined)');
        if (alreadyInjected?.value) {
            this.state.injected = true;
            this.state.lastRefreshAt = Date.now();
            logger_1.logger.info('[Overlay/Manus] Capa Manus ya activa, reutilizando');
            return this.state;
        }
        // Inject overlay script
        const injectionScript = this.generateInjectionScript(options.refreshIntervalMs);
        await hyperion.eval(injectionScript);
        this.state.injected = true;
        this.state.lastUpdateAt = Date.now();
        logger_1.logger.info('[Overlay/Manus] Capa Manus multicolor inyectada y activa con bucle dinámico');
        return this.state;
    }
    /**
     * Generate overlay injection script
     */
    generateInjectionScript(refreshIntervalMs) {
        return `
      (function() {
        if (window.__HY_OVERLAY_READY) return;
        
        window.__HY_OVERLAY_STATE = {
          intervals: [],
          observers: [],
          elements: new Map(),
          elementCount: 0,
          lastRefresh: 0,
        };
        
        // Multi-color palette for Capa Manus
        var COLORS = [
          { border: '#00ff66', bg: 'rgba(0, 255, 102, 0.14)', badge: '#00ff66', text: '#000000' },
          { border: '#00e5ff', bg: 'rgba(0, 229, 255, 0.14)', badge: '#00e5ff', text: '#000000' },
          { border: '#ff007f', bg: 'rgba(255, 0, 127, 0.14)', badge: '#ff007f', text: '#ffffff' },
          { border: '#ffea00', bg: 'rgba(255, 234, 0, 0.14)', badge: '#ffea00', text: '#000000' },
          { border: '#d500f9', bg: 'rgba(213, 0, 249, 0.14)', badge: '#d500f9', text: '#ffffff' },
          { border: '#ff6d00', bg: 'rgba(255, 109, 0, 0.14)', badge: '#ff6d00', text: '#000000' },
          { border: '#2979ff', bg: 'rgba(41, 121, 255, 0.14)', badge: '#2979ff', text: '#ffffff' },
          { border: '#00e676', bg: 'rgba(0, 230, 118, 0.14)', badge: '#00e676', text: '#000000' }
        ];

        var style = document.createElement('style');
        style.id = '__hyperion_overlay_styles';
        style.textContent = '#__hyperion_overlay_container{position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647;overflow:hidden;}' +
          '.hy-overlay-rect{position:fixed;z-index:2147483647;pointer-events:none;font-family:monospace;font-size:11px;box-sizing:border-box;border:2px solid;border-radius:3px;}' +
          '.hy-overlay-badge{position:absolute;top:-18px;left:0;padding:2px 6px;font-weight:800;font-size:10px;border-radius:3px;z-index:2147483647;box-shadow:0 2px 5px rgba(0,0,0,0.5);font-family:monospace;letter-spacing:0.5px;}' +
          '.hy-overlay-banner{position:fixed;top:6px;left:6px;background:rgba(0,0,0,0.9);border:1px solid #00ff66;color:#00ff66;padding:4px 10px;border-radius:4px;font:bold 12px monospace;z-index:2147483647;pointer-events:none;}';
        document.head.appendChild(style);
        
        var selectors = 'button, a, input, textarea, select, [role="button"], [role="menuitem"], [role="tab"], [role="textbox"], [role="switch"], [contenteditable="true"], [onclick]';

        function inViewport(r) {
          return r.left < window.innerWidth && r.right > 0 && r.top < window.innerHeight && r.bottom > 0;
        }

        function refreshOverlay() {
          var now = Date.now();
          if (now - window.__HY_OVERLAY_STATE.lastRefresh < 100) return;
          window.__HY_OVERLAY_STATE.lastRefresh = now;
          
          var container = document.getElementById('__hyperion_overlay_container');
          if (!container) {
            container = document.createElement('div');
            container.id = '__hyperion_overlay_container';
            document.documentElement.appendChild(container);
          }
          
          container.innerHTML = '';
          var allElements = document.querySelectorAll(selectors);
          var visibleElements = [];
          var visibleCount = 0;
          
          for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            if (el.id === '__hyperion_overlay_container' || el.classList.contains('hy-overlay-rect')) continue;
            if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
            
            var rect = el.getBoundingClientRect();
            if (rect.width < 8 || rect.height < 8) continue;
            if (!inViewport(rect)) continue;
            
            visibleCount++;
            var color = COLORS[(visibleCount - 1) % COLORS.length];
            
            var overlay = document.createElement('div');
            overlay.className = 'hy-overlay-rect';
            overlay.dataset.hySid = visibleCount;
            overlay.style.left = Math.round(rect.left) + 'px';
            overlay.style.top = Math.round(rect.top) + 'px';
            overlay.style.width = Math.round(rect.width) + 'px';
            overlay.style.height = Math.round(rect.height) + 'px';
            overlay.style.borderColor = color.border;
            overlay.style.backgroundColor = color.bg;
            
            var badge = document.createElement('div');
            badge.className = 'hy-overlay-badge';
            badge.textContent = '[' + visibleCount + ']';
            badge.style.backgroundColor = color.badge;
            badge.style.color = color.text;
            overlay.appendChild(badge);
            
            container.appendChild(overlay);
            
            var text = (el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().replace(/\\s+/g, ' ').slice(0, 40);
            visibleElements.push({
              overlayId: visibleCount,
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2),
              w: Math.round(rect.width),
              h: Math.round(rect.height),
              text: text,
              tag: el.tagName.toLowerCase(),
              color: color.badge
            });
          }
          
          var banner = document.createElement('div');
          banner.className = 'hy-overlay-banner';
          banner.textContent = '⚡ CAPA MANUS MULTICOLOR ACTIVA [' + visibleCount + ' ELEMENTOS]';
          container.appendChild(banner);
          
          window.__HY_OVERLAY_STATE.elementCount = visibleCount;
          window.__HY_OVERLAY_CACHE = visibleElements;
        }
        
        refreshOverlay();
        
        var interval = setInterval(refreshOverlay, ${refreshIntervalMs});
        window.__HY_OVERLAY_STATE.intervals.push(interval);
        
        window.addEventListener('resize', refreshOverlay, { passive: true });
        window.addEventListener('scroll', refreshOverlay, { passive: true });
        
        var observer = new MutationObserver(function() { refreshOverlay(); });
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'style', 'disabled', 'hidden', 'aria-hidden'],
        });
        window.__HY_OVERLAY_STATE.observers.push(observer);
        
        window.__HY_GET_OVERLAY = function() {
          return window.__HY_OVERLAY_CACHE || [];
        };
        
        window.__HY_CLICK_OVERLAY = function(overlayId) {
          var allElements = document.querySelectorAll(selectors);
          var visibleCount = 0;
          for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            if (el.offsetWidth === 0 || el.offsetHeight === 0) continue;
            var rect = el.getBoundingClientRect();
            if (rect.width < 8 || rect.height < 8) continue;
            if (!inViewport(rect)) continue;
            visibleCount++;
            if (visibleCount === overlayId) {
              el.focus();
              el.click();
              return true;
            }
          }
          return false;
        };
        
        window.__HY_OVERLAY_KILL = function() {
          if (window.__HY_OVERLAY_STATE) {
            window.__HY_OVERLAY_STATE.intervals.forEach(function(i) { clearInterval(i); });
            window.__HY_OVERLAY_STATE.observers.forEach(function(o) { o.disconnect(); });
          }
          var container = document.getElementById('__hyperion_overlay_container');
          if (container) container.remove();
          var style = document.getElementById('__hyperion_overlay_styles');
          if (style) style.remove();
          delete window.__HY_OVERLAY_STATE;
          delete window.__HY_OVERLAY_READY;
          delete window.__HY_OVERLAY_CACHE;
        };
        
        window.__HY_OVERLAY_READY = true;
      })()
    `;
    }
    /**
     * Kill overlay
     */
    async kill(hyperion) {
        try {
            await hyperion.eval('window.__HY_OVERLAY_KILL?.()');
            logger_1.logger.info('[Overlay/Manus] Capa Manus finalizada limpiamente');
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
            await this.ensureInjected(hyperion);
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