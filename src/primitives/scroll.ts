import { ConnectionManager } from '../connection'

export interface ScrollOptions {
  selector?: string
  deltaX?: number
  deltaY?: number
  toTop?: boolean
  toBottom?: boolean
  startX?: number
  startY?: number
  block?: 'start' | 'center' | 'end' | 'nearest'
}

export class ScrollPrimitive {
  constructor(private cxn: ConnectionManager) {}

  async scroll(options: ScrollOptions): Promise<void> {
    if (options.selector) {
      await this.scrollIntoView(options.selector, options.block)
    } else if (options.deltaX !== undefined || options.deltaY !== undefined) {
      await this.scrollBy(options.deltaX || 0, options.deltaY || 0, options.startX, options.startY)
    } else if (options.toTop) {
      await this.scrollToTop()
    } else if (options.toBottom) {
      await this.scrollToBottom()
    }
  }

  private async scrollIntoView(selector: string, block: string = 'center'): Promise<void> {
    await this.cxn.evaluate(`
      document.querySelector('${selector.replace(/'/g, "\\'")}')
        ?.scrollIntoView({behavior: 'instant', block: '${block}'})
    `)
    await new Promise(r => setTimeout(r, 100))
  }

  private async scrollBy(deltaX: number, deltaY: number, startX = 0, startY = 0): Promise<void> {
    // Method 1: JS scrollBy
    await this.cxn.evaluate(`window.scrollBy(${deltaX}, ${deltaY})`)

    // Method 2: CDP synthesizeScrollGesture (for touch-like scroll)
    if (deltaY !== 0) {
      try {
        await this.cxn.call('Input.synthesizeScrollGesture', {
          x: startX,
          y: startY,
          yDistance: deltaY,
          gestureSourceType: 'default',
          speed: 800,
          preventFling: true
        })
      } catch {}
    }
    if (deltaX !== 0) {
      try {
        await this.cxn.call('Input.synthesizeScrollGesture', {
          x: startX,
          y: startY,
          xDistance: deltaX,
          gestureSourceType: 'default',
          speed: 800,
          preventFling: true
        })
      } catch {}
    }
  }

  private async scrollToTop(): Promise<void> {
    await this.cxn.evaluate('window.scrollTo(0, 0)')
  }

  private async scrollToBottom(): Promise<void> {
    await this.cxn.evaluate('window.scrollTo(0, document.body.scrollHeight)')
  }

  async scrollInfinite(
    stopSelector?: string,
    maxScrolls = 50,
    scrollDelay = 1000
  ): Promise<void> {
    for (let i = 0; i < maxScrolls; i++) {
      // Check stop condition
      if (stopSelector) {
        const result = await this.cxn.evaluate(
          `document.querySelector('${stopSelector.replace(/'/g, "\\'")}') !== null`
        )
        if (result?.value) return
      }

      // Scroll 80% of viewport
      await this.cxn.evaluate('window.scrollBy(0, window.innerHeight * 0.8)')
      await new Promise(r => setTimeout(r, scrollDelay))

      // Check if at bottom
      const atBottom = await this.cxn.evaluate(
        'window.innerHeight + window.scrollY >= document.body.scrollHeight - 100'
      )
      if (atBottom?.value) return
    }
  }
}
