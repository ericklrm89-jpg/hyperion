import { ConnectionManager } from '../connection';

export interface ScrollOptions {
  selector?: string;
  panel?: 'sidebar' | 'feed' | 'chat' | 'modal' | 'left' | 'right' | 'main' | string;
  deltaX?: number;
  deltaY?: number;
  toTop?: boolean;
  toBottom?: boolean;
  startX?: number;
  startY?: number;
  block?: 'start' | 'center' | 'end' | 'nearest';
}

export interface ScrollablePanel {
  id?: string;
  className?: string;
  tag: string;
  role?: string | null;
  rect: { left: number; top: number; width: number; height: number };
  scrollHeight: number;
  clientHeight: number;
  scrollWidth: number;
  clientWidth: number;
  isMainPage: boolean;
}

export class ScrollPrimitive {
  constructor(private cxn: ConnectionManager) {}

  /**
   * Universal Smart Scroll across sub-panels, modals, sidebars, and feeds
   */
  async scroll(options: ScrollOptions): Promise<void> {
    if (options.selector) {
      await this.scrollIntoView(options.selector, options.block);
    } else if (options.panel) {
      await this.scrollPanel(options.panel, options.deltaY || 0, options.deltaX || 0);
    } else if (options.deltaX !== undefined || options.deltaY !== undefined) {
      await this.scrollBy(options.deltaX || 0, options.deltaY || 0, options.startX, options.startY);
    } else if (options.toTop) {
      await this.scrollToTop();
    } else if (options.toBottom) {
      await this.scrollToBottom();
    }
  }

  /**
   * Detects all active scrollable containers and panels currently visible in the DOM
   */
  async detectScrollablePanels(): Promise<ScrollablePanel[]> {
    const res = await this.cxn.evaluate(`
      (() => {
        const panels = [];
        const all = Array.from(document.querySelectorAll('*'));
        
        for (let i = 0; i < all.length; i++) {
          const el = all[i];
          if (el.nodeType !== 1) continue;
          
          const style = window.getComputedStyle(el);
          const hasScrollY = (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 10;
          const hasScrollX = (style.overflowX === 'auto' || style.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 10;
          
          if (hasScrollY || hasScrollX) {
            const r = el.getBoundingClientRect();
            if (r.width > 40 && r.height > 40 && r.top < window.innerHeight && r.bottom > 0) {
              panels.push({
                id: el.id || undefined,
                className: typeof el.className === 'string' ? el.className.slice(0, 40) : undefined,
                tag: el.tagName,
                role: el.getAttribute('role'),
                rect: { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) },
                scrollHeight: el.scrollHeight,
                clientHeight: el.clientHeight,
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth,
                isMainPage: el === document.documentElement || el === document.body
              });
            }
          }
        }
        return panels;
      })()
    `);

    return (res?.value || []) as ScrollablePanel[];
  }

  /**
   * Scrolls a specific sub-panel by semantic name or selector
   */
  async scrollPanel(panelNameOrSelector: string, deltaY = 0, deltaX = 0): Promise<void> {
    const panels = await this.detectScrollablePanels();
    let targetPanel = panels.find(p => p.id === panelNameOrSelector || (p.role && p.role.includes(panelNameOrSelector)));

    // Semantic heuristics for common platforms
    if (!targetPanel) {
      if (panelNameOrSelector === 'sidebar' || panelNameOrSelector === 'left' || panelNameOrSelector === 'chat-list') {
        targetPanel = panels.find(p => p.rect.left < 500 && p.rect.width < 600 && !p.isMainPage);
      } else if (panelNameOrSelector === 'feed' || panelNameOrSelector === 'main' || panelNameOrSelector === 'center') {
        targetPanel = panels.find(p => p.rect.left >= 400 || p.isMainPage);
      } else if (panelNameOrSelector === 'modal' || panelNameOrSelector === 'dialog') {
        targetPanel = panels.find(p => p.role === 'dialog' || p.rect.top > 50 && p.rect.height < 700);
      }
    }

    if (targetPanel) {
      const centerX = Math.round(targetPanel.rect.left + targetPanel.rect.width / 2);
      const centerY = Math.round(targetPanel.rect.top + targetPanel.rect.height / 2);
      await this.scrollBy(deltaX, deltaY, centerX, centerY);
    } else {
      // Fallback to generic scroll
      await this.scrollBy(deltaX, deltaY);
    }
  }

  private async scrollIntoView(selector: string, block: string = 'center'): Promise<void> {
    await this.cxn.evaluate(`
      (() => {
        const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: '${block}' });
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 100));
  }

  private async scrollBy(deltaX: number, deltaY: number, startX = 0, startY = 0): Promise<void> {
    // 1. Dispatch native mouseWheel CDP at target position (so internal overflow panel scrolls naturally)
    const targetX = startX || 400;
    const targetY = startY || 400;

    try {
      await this.cxn.call('Input.dispatchMouseEvent', {
        type: 'mouseWheel',
        x: targetX,
        y: targetY,
        deltaX,
        deltaY,
      });
    } catch {}

    // 2. Smart DOM fallback for SPAs with internal overflow-y containers
    await this.cxn.evaluate(`
      (() => {
        const el = document.elementFromPoint(${targetX}, ${targetY}) || document.querySelector('#pane-side, [role="feed"], [role="region"], [role="dialog"], main');
        if (el) {
          let cur = el;
          while (cur && cur !== document.body) {
            const style = window.getComputedStyle(cur);
            if (cur.scrollHeight > cur.clientHeight && (style.overflowY === 'auto' || style.overflowY === 'scroll')) {
              cur.scrollTop += ${deltaY};
              cur.scrollLeft += ${deltaX};
              return;
            }
            cur = cur.parentElement;
          }
        }
        window.scrollBy(${deltaX}, ${deltaY});
      })()
    `);
  }

  private async scrollToTop(): Promise<void> {
    await this.cxn.evaluate('window.scrollTo(0, 0)');
  }

  private async scrollToBottom(): Promise<void> {
    await this.cxn.evaluate('window.scrollTo(0, document.body.scrollHeight)');
  }

  async scrollInfinite(
    stopSelector?: string,
    maxScrolls = 50,
    scrollDelay = 1000
  ): Promise<void> {
    for (let i = 0; i < maxScrolls; i++) {
      if (stopSelector) {
        const result = await this.cxn.evaluate(
          `document.querySelector('${stopSelector.replace(/'/g, "\\'")}') !== null`
        );
        if (result?.value) return;
      }

      await this.scrollBy(0, 400);
      await new Promise(r => setTimeout(r, scrollDelay));

      const atBottom = await this.cxn.evaluate(
        'window.innerHeight + window.scrollY >= document.body.scrollHeight - 100'
      );
      if (atBottom?.value) return;
    }
  }
}
