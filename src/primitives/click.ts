import { ConnectionManager } from '../connection';

export interface ClickOptions {
  button?: 'left' | 'middle' | 'right';
  clickCount?: number;
  delay?: number;       // ms between press and release
  modifiers?: number;
  retries?: number;
  scrollIntoView?: boolean;
  strategy?: 'cdp-first' | 'js-first' | 'js-only';
  fastJS?: boolean;
}

export class ClickPrimitive {
  constructor(private cxn: ConnectionManager) {}

  /**
   * Performs dual-tier robust click with automatic fallback between CDP and JS synthetic events
   */
  async click(
    selector: string,
    options: ClickOptions = {}
  ): Promise<boolean> {
    const {
      button = 'left',
      clickCount = 1,
      delay = 50,
      modifiers = 0,
      retries = 3,
      scrollIntoView = true,
      strategy = 'cdp-first',
      fastJS = false,
    } = options;

    // Fast-path: Direct JS synthetic click
    if (fastJS || strategy === 'js-only') {
      return await this.clickJS(selector);
    }

    // JS-First Strategy with CDP fallback
    if (strategy === 'js-first') {
      const jsSuccess = await this.clickJS(selector);
      if (jsSuccess) return true;
    }

    // CDP-First Strategy (Default) with JS fallback
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // 1. Get pure viewport coordinates via JS (without window.scrollX/Y pollution)
        const coords = await this.getElementCoords(selector, scrollIntoView);
        if (!coords) {
          // If coordinates calculation fails, attempt JS fallback immediately
          return await this.clickJS(selector);
        }

        const { centerX, centerY } = coords;

        // 2. Check and dismiss any blocking overlay/dialogs
        const overlay = await this.detectOverlay(centerX, centerY);
        if (overlay) {
          await this.dismissOverlay(overlay);
          await new Promise(r => setTimeout(r, 200));
          continue;
        }

        // 3. Dispatch CDP mouse click sequence
        const btnMap: Record<string, string> = { left: 'left', middle: 'middle', right: 'right' };
        const btnFlag: Record<string, number> = { left: 1, middle: 4, right: 2 };

        await this.cxn.dispatchMouseEvent({
          type: 'mousePressed',
          x: centerX,
          y: centerY,
          button: btnMap[button] as any,
          buttons: btnFlag[button],
          clickCount,
          modifiers,
        });

        if (delay > 0) {
          await new Promise(r => setTimeout(r, delay));
        }

        await this.cxn.dispatchMouseEvent({
          type: 'mouseReleased',
          x: centerX,
          y: centerY,
          button: btnMap[button] as any,
          buttons: 0,
          clickCount,
          modifiers,
        });

        return true;
      } catch (err: any) {
        if (attempt >= retries) {
          // Dual-tier fallback: Try clickJS before giving up
          return await this.clickJS(selector);
        }
        await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
      }
    }

    return await this.clickJS(selector);
  }

  /**
   * Dual-Tier JavaScript Click: Complete synthetic event chain + Native .click()
   * Dispatches PointerEvents, MouseEvents, .focus({ preventScroll: true }) and .click()
   */
  async clickJS(selector: string): Promise<boolean> {
    const escaped = selector.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const res = await this.cxn.evaluate(`
      (() => {
        try {
          const el = document.querySelector('${escaped}');
          if (!el) return { success: false, reason: 'Element not found' };

          // 1. Pointer Down / Up
          el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window, pointerType: 'mouse', isPrimary: true }));
          
          // 2. Mouse Down
          el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, buttons: 1 }));
          
          // 3. Focus if focusable
          if (typeof (el as any).focus === 'function') {
            (el as any).focus({ preventScroll: true });
          }

          // 4. Pointer Up
          el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window, pointerType: 'mouse', isPrimary: true }));
          
          // 5. Mouse Up
          el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, buttons: 0 }));
          
          // 6. Click Event
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

          // 7. Native .click()
          if (typeof (el as any).click === 'function') {
            (el as any).click();
          }

          return { success: true };
        } catch (e: any) {
          return { success: false, reason: e?.message || String(e) };
        }
      })()
    `);

    return !!res?.value?.success;
  }

  async clickAt(
    x: number,
    y: number,
    options: ClickOptions = {}
  ): Promise<void> {
    const { button = 'left', clickCount = 1, delay = 50, modifiers = 0 } = options;
    const btnMap: Record<string, string> = { left: 'left', middle: 'middle', right: 'right' };
    const btnFlag: Record<string, number> = { left: 1, middle: 4, right: 2 };

    await this.cxn.dispatchMouseEvent({
      type: 'mousePressed',
      x,
      y,
      button: btnMap[button] as any,
      buttons: btnFlag[button],
      clickCount,
      modifiers,
    });
    if (delay > 0) await new Promise(r => setTimeout(r, delay));
    await this.cxn.dispatchMouseEvent({
      type: 'mouseReleased',
      x,
      y,
      button: btnMap[button] as any,
      buttons: 0,
      clickCount,
      modifiers,
    });
  }

  async hover(selector: string): Promise<void> {
    const coords = await this.getElementCoords(selector, false);
    if (!coords) throw new Error(`Element not found: ${selector}`);
    await this.cxn.dispatchMouseEvent({
      type: 'mouseMoved',
      x: coords.centerX,
      y: coords.centerY,
      button: 'none',
      buttons: 0,
    });
  }

  async rightClick(selector: string): Promise<void> {
    await this.click(selector, { button: 'right', clickCount: 1 });
  }

  async doubleClick(selector: string): Promise<void> {
    await this.click(selector, { button: 'left', clickCount: 2, delay: 0 });
  }

  private async getElementCoords(
    selector: string,
    scrollIntoView: boolean
  ): Promise<{ centerX: number; centerY: number } | null> {
    const escaped = selector.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const result = await this.cxn.evaluate(`
      (() => {
        const el = document.querySelector('${escaped}');
        if (!el) return null;
        if (${scrollIntoView}) {
          el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        }
        const r = el.getBoundingClientRect();
        return JSON.stringify({
          centerX: Math.round(r.left + r.width / 2),
          centerY: Math.round(r.top + r.height / 2)
        });
      })()
    `);
    if (!result?.value) return null;
    return JSON.parse(result.value);
  }

  private async detectOverlay(x: number, y: number): Promise<{ closeSelectors: string[] } | null> {
    try {
      const js = 'return (function(){var el=document.elementFromPoint(' + x + ',' + y + ');if(!el)return null;var ov=el.closest("[class*=\\"modal\\"],[class*=\\"overlay\\"],[class*=\\"popup\\"],[class*=\\"dialog\\"],[class*=\\"backdrop\\"],[role=\\"dialog\\"],[aria-modal=\\"true\\"]");if(!ov)return null;return JSON.stringify({closeSelectors:["button[class*=\\"close\\"]","button[aria-label*=\\"close\\"]","button[aria-label*=\\"Close\\"]","[class*=\\"dismiss\\"]","[class*=\\"close-btn\\"]"]})})()';
      const result = await this.cxn.evaluate(js);
      return result?.value ? JSON.parse(result.value) : null;
    } catch {
      return null;
    }
  }

  private async dismissOverlay(overlay: { closeSelectors: string[] }): Promise<void> {
    for (const sel of overlay.closeSelectors) {
      try {
        await this.cxn.evaluate(`document.querySelector('${sel}')?.click()`);
      } catch {}
    }
    try {
      await this.cxn.dispatchKeyEvent({ type: 'rawKeyDown', key: 'Escape', windowsVirtualKeyCode: 27 });
      await this.cxn.dispatchKeyEvent({ type: 'keyUp', key: 'Escape', windowsVirtualKeyCode: 27 });
    } catch {}
  }
}
