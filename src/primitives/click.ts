import { ConnectionManager } from '../connection'

export interface ClickOptions {
  button?: 'left' | 'middle' | 'right'
  clickCount?: number
  delay?: number       // ms between press and release
  modifiers?: number
  retries?: number
  scrollIntoView?: boolean
}

export class ClickPrimitive {
  constructor(private cxn: ConnectionManager) {}

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
      scrollIntoView = true
    } = options

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // 1. Get element coordinates via JS (avoids CDP node ID staleness)
        const coords = await this.getElementCoords(selector, scrollIntoView)
        if (!coords) throw new Error(`Element not found: ${selector}`)

        const { centerX, centerY } = coords

        // 2. Check for overlays
        const overlay = await this.detectOverlay(centerX, centerY)
        if (overlay) {
          await this.dismissOverlay(overlay)
          await new Promise(r => setTimeout(r, 200))
          continue
        }

        // 3. Dispatch click sequence
        const btnMap: Record<string, string> = { left: 'left', middle: 'middle', right: 'right' }
        const btnFlag: Record<string, number> = { left: 1, middle: 4, right: 2 }

        await this.cxn.dispatchMouseEvent({
          type: 'mousePressed',
          x: centerX,
          y: centerY,
          button: btnMap[button] as any,
          buttons: btnFlag[button],
          clickCount,
          modifiers
        })

        if (delay > 0) {
          await new Promise(r => setTimeout(r, delay))
        }

        await this.cxn.dispatchMouseEvent({
          type: 'mouseReleased',
          x: centerX,
          y: centerY,
          button: btnMap[button] as any,
          buttons: 0,
          clickCount,
          modifiers
        })

        return true

      } catch (err: any) {
        if (attempt >= retries) throw err
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
      }
    }
    return false
  }

  async clickAt(
    x: number,
    y: number,
    options: ClickOptions = {}
  ): Promise<void> {
    const { button = 'left', clickCount = 1, delay = 50, modifiers = 0 } = options
    const btnMap: Record<string, string> = { left: 'left', middle: 'middle', right: 'right' }
    const btnFlag: Record<string, number> = { left: 1, middle: 4, right: 2 }

    await this.cxn.dispatchMouseEvent({
      type: 'mousePressed',
      x, y,
      button: btnMap[button] as any,
      buttons: btnFlag[button],
      clickCount,
      modifiers
    })
    if (delay > 0) await new Promise(r => setTimeout(r, delay))
    await this.cxn.dispatchMouseEvent({
      type: 'mouseReleased',
      x, y,
      button: btnMap[button] as any,
      buttons: 0,
      clickCount,
      modifiers
    })
  }

  async hover(selector: string): Promise<void> {
    const coords = await this.getElementCoords(selector, false)
    if (!coords) throw new Error(`Element not found: ${selector}`)
    await this.cxn.dispatchMouseEvent({
      type: 'mouseMoved',
      x: coords.centerX,
      y: coords.centerY,
      button: 'none',
      buttons: 0
    })
  }

  async rightClick(selector: string): Promise<void> {
    await this.click(selector, { button: 'right', clickCount: 1 })
  }

  async doubleClick(selector: string): Promise<void> {
    await this.click(selector, { button: 'left', clickCount: 2, delay: 0 })
  }

  private async getElementCoords(
    selector: string,
    scrollIntoView: boolean
  ): Promise<{ centerX: number; centerY: number } | null> {
    const escaped = selector.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const result = await this.cxn.evaluate(`
      (() => {
        const el = document.querySelector('${escaped}');
        if (!el) return null;
        if (${scrollIntoView}) el.scrollIntoView({block: 'center', behavior: 'instant'});
        const r = el.getBoundingClientRect();
        return JSON.stringify({
          centerX: Math.round(r.left + r.width / 2),
          centerY: Math.round(r.top + r.height / 2)
        });
      })()
    `)
    if (!result?.value) return null
    return JSON.parse(result.value)
  }

  private async detectOverlay(x: number, y: number): Promise<{ closeSelectors: string[] } | null> {
    try {
      const js = 'return (function(){var el=document.elementFromPoint(' + x + ',' + y + ');if(!el)return null;var ov=el.closest("[class*=\\"modal\\"],[class*=\\"overlay\\"],[class*=\\"popup\\"],[class*=\\"dialog\\"],[class*=\\"backdrop\\"],[role=\\"dialog\\"],[aria-modal=\\"true\\"]");if(!ov)return null;return JSON.stringify({closeSelectors:["button[class*=\\"close\\"]","button[aria-label*=\\"close\\"]","button[aria-label*=\\"Close\\"]","[class*=\\"dismiss\\"]","[class*=\\"close-btn\\"]"]})})()'
      const result = await this.cxn.evaluate(js)
      return result?.value ? JSON.parse(result.value) : null
    } catch {
      return null
    }
  }

  private async dismissOverlay(overlay: { closeSelectors: string[] }): Promise<void> {
    for (const sel of overlay.closeSelectors) {
      try {
        await this.cxn.evaluate(`document.querySelector('${sel}')?.click()`)
      } catch {}
    }
    try {
      await this.cxn.dispatchKeyEvent({ type: 'rawKeyDown', key: 'Escape', windowsVirtualKeyCode: 27 })
      await this.cxn.dispatchKeyEvent({ type: 'keyUp', key: 'Escape', windowsVirtualKeyCode: 27 })
    } catch {}
  }
}
