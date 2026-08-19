import { Hyperion } from '../hyperion';
import { OverlayState } from '../core/types';
import { logger } from '../core/logger';

/**
 * Overlay Engine - High-contrast multicolor dynamic element mapping (Capa Manus)
 * Comprehensive recognition for WhatsApp Web, Instagram, Facebook, TikTok, and modern SPAs
 */
export class OverlayEngine {
  private state: OverlayState = {
    injected: false,
    elementCount: 0,
    lastRefreshAt: 0,
    lastUpdateAt: 0,
    elementMap: new Map(),
  };

  /**
   * Ensure overlay is injected (ONLY ONCE)
   */
  async ensureInjected(
    hyperion: Hyperion,
    options = { refreshIntervalMs: 250 }
  ): Promise<OverlayState> {
    if (this.state.injected) {
      return this.state;
    }

    const alreadyInjected = await hyperion.eval(
      '(window.__HY_OVERLAY_READY !== undefined)'
    );

    if (alreadyInjected?.value) {
      this.state.injected = true;
      this.state.lastRefreshAt = Date.now();
      logger.info('[Overlay/Manus] Capa Manus ya activa, reutilizando');
      return this.state;
    }

    const injectionScript = this.generateInjectionScript(
      options.refreshIntervalMs
    );
    await hyperion.eval(injectionScript);

    this.state.injected = true;
    this.state.lastUpdateAt = Date.now();
    logger.info('[Overlay/Manus] Capa Manus multicolor integral inyectada y activa con bucle dinámico');

    return this.state;
  }

  /**
   * Generate overlay injection script
   */
  private generateInjectionScript(refreshIntervalMs: number): string {
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
        
        var COLORS = [
          { border: '#00ff66', bg: 'rgba(0, 255, 102, 0.12)', badge: '#00ff66', text: '#000000' },
          { border: '#00e5ff', bg: 'rgba(0, 229, 255, 0.12)', badge: '#00e5ff', text: '#000000' },
          { border: '#ff007f', bg: 'rgba(255, 0, 127, 0.12)', badge: '#ff007f', text: '#ffffff' },
          { border: '#ffea00', bg: 'rgba(255, 234, 0, 0.12)', badge: '#ffea00', text: '#000000' },
          { border: '#d500f9', bg: 'rgba(213, 0, 249, 0.12)', badge: '#d500f9', text: '#ffffff' },
          { border: '#ff6d00', bg: 'rgba(255, 109, 0, 0.12)', badge: '#ff6d00', text: '#000000' },
          { border: '#2979ff', bg: 'rgba(41, 121, 255, 0.12)', badge: '#2979ff', text: '#ffffff' },
          { border: '#00e676', bg: 'rgba(0, 230, 118, 0.12)', badge: '#00e676', text: '#000000' },
          { border: '#ff1744', bg: 'rgba(255, 23, 68, 0.12)', badge: '#ff1744', text: '#ffffff' },
          { border: '#00b0ff', bg: 'rgba(0, 176, 255, 0.12)', badge: '#00b0ff', text: '#000000' }
        ];

        var style = document.createElement('style');
        style.id = '__hyperion_overlay_styles';
        style.textContent = '#__hyperion_overlay_container{position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647;overflow:hidden;}' +
          '.hy-overlay-rect{position:fixed;z-index:2147483647;pointer-events:none;font-family:monospace;font-size:11px;box-sizing:border-box;border:2px solid;border-radius:3px;}' +
          '.hy-overlay-badge{position:absolute;top:0;left:0;padding:1px 4px;font-weight:bold;font-size:10px;line-height:12px;border-radius:0 0 3px 0;z-index:2147483647;box-shadow:0 1px 3px rgba(0,0,0,0.6);font-family:monospace;letter-spacing:0.5px;}' +
          '.hy-overlay-banner{position:fixed;top:6px;left:6px;background:rgba(0,0,0,0.9);border:1px solid #00ff66;color:#00ff66;padding:4px 10px;border-radius:4px;font:bold 12px monospace;z-index:2147483647;pointer-events:none;}';
        document.head.appendChild(style);

        function inViewport(r) {
          return r.left < window.innerWidth && r.right > 0 && r.top < window.innerHeight && r.bottom > 0;
        }

        function isInteractive(el) {
          if (!el || el.id === '__hyperion_overlay_container' || el.classList.contains('hy-overlay-rect')) return false;
          if (el.offsetWidth === 0 || el.offsetHeight === 0) return false;
          if (el.tagName === 'SVG' || el.tagName === 'PATH' || el.tagName === 'G') return false;

          var tag = el.tagName;
          if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'A') return true;
          if (el.isContentEditable || el.getAttribute('contenteditable') === 'true' || el.getAttribute('role') === 'textbox') return true;
          
          var role = el.getAttribute('role');
          if (role === 'button' || role === 'tab' || role === 'menuitem' || role === 'listitem' || role === 'row' || role === 'option' || role === 'switch' || role === 'checkbox' || role === 'link') return true;

          if (el.hasAttribute('onclick') || el.hasAttribute('data-icon') || el.hasAttribute('data-tab') || el.hasAttribute('data-testid')) return true;

          var style = window.getComputedStyle(el);
          if (style.cursor === 'pointer') return true;

          return false;
        }

        function collectElements() {
          var all = document.querySelectorAll('*');
          var rawList = [];

          for (var i = 0; i < all.length; i++) {
            try {
              var el = all[i];
              if (!isInteractive(el)) continue;

              var b = el.getBoundingClientRect();
              if (b.width < 10 || b.height < 10) continue;
              if (b.width > window.innerWidth * 0.95 && b.height > window.innerHeight * 0.95) continue;
              if (!inViewport(b)) continue;

              rawList.push({ el: el, rect: b });
            } catch (e) {}
          }

          var filtered = [];
          for (var j = 0; j < rawList.length; j++) {
            var item = rawList[j];
            var el = item.el;
            var b = item.rect;
            
            var isDuplicate = false;
            for (var k = 0; k < filtered.length; k++) {
              var existing = filtered[k];
              var eb = existing.rect;
              var diffX = Math.abs(b.left - eb.left);
              var diffY = Math.abs(b.top - eb.top);
              var diffW = Math.abs(b.width - eb.width);
              var diffH = Math.abs(b.height - eb.height);

              if (diffX < 5 && diffY < 5 && diffW < 10 && diffH < 10) {
                isDuplicate = true;
                if (!existing.text && (el.getAttribute('aria-label') || el.textContent.trim())) {
                  filtered[k] = item;
                }
                break;
              }
            }

            if (!isDuplicate) {
              filtered.push(item);
            }
          }

          return filtered;
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
          var filtered = collectElements();
          var visibleElements = [];
          var visibleCount = 0;
          
          for (var i = 0; i < filtered.length; i++) {
            var item = filtered[i];
            var el = item.el;
            var rect = item.rect;
            
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
            
            var text = (el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder') || el.getAttribute('data-icon') || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 35);
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
          var filtered = collectElements();
          if (overlayId > 0 && overlayId <= filtered.length) {
            var el = filtered[overlayId - 1].el;
            el.focus();
            el.click();
            return true;
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
  async kill(hyperion: Hyperion): Promise<void> {
    try {
      await hyperion.eval('window.__HY_OVERLAY_KILL?.()');
      logger.info('[Overlay/Manus] Capa Manus finalizada limpiamente');
    } catch (err) {
      logger.warn({ err }, '[Overlay] Kill error');
    }
    this.state.injected = false;
    this.state.elementCount = 0;
    this.state.elementMap.clear();
  }

  /**
   * Get overlay elements
   */
  async getElements(hyperion: Hyperion): Promise<any[]> {
    if (!this.state.injected) {
      await this.ensureInjected(hyperion);
    }
    const result = await hyperion.eval('window.__HY_GET_OVERLAY?.()');
    return result?.value || [];
  }

  /**
   * Click by overlay ID
   */
  async clickById(hyperion: Hyperion, overlayId: number): Promise<boolean> {
    if (!this.state.injected) {
      await this.ensureInjected(hyperion);
    }
    const result = await hyperion.eval(`window.__HY_CLICK_OVERLAY?.(${overlayId})`);
    return result?.value === true;
  }

  /**
   * Get state
   */
  getState(): OverlayState {
    return { ...this.state };
  }
}
