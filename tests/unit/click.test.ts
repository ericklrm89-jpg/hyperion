import { ClickPrimitive } from '../../src/primitives/click'

describe('ClickPrimitive - Real CDP Dispatch Tests', () => {
  let mockCxn: any
  let clicker: ClickPrimitive

  beforeEach(() => {
    mockCxn = {
      call: jest.fn().mockResolvedValue({}),
      dispatchMouseEvent: jest.fn().mockResolvedValue({}),
      evaluate: jest.fn().mockImplementation((js: string) => {
        if (js.includes('getBoundingClientRect')) {
          return Promise.resolve({
            value: JSON.stringify({ centerX: 150, centerY: 250 })
          })
        }
        return Promise.resolve({ value: null })
      })
    }
    clicker = new ClickPrimitive(mockCxn)
  })

  it('should dispatch mouse pressed and mouse released with viewport coordinates', async () => {
    await clicker.click('button.submit', { delay: 10 })

    expect(mockCxn.evaluate).toHaveBeenCalled()
    expect(mockCxn.dispatchMouseEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'mousePressed',
      x: 150,
      y: 250,
      button: 'left',
      clickCount: 1,
      buttons: 1
    }))
    expect(mockCxn.dispatchMouseEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'mouseReleased',
      x: 150,
      y: 250,
      button: 'left',
      clickCount: 1,
      buttons: 0
    }))
  })

  it('should dispatch mouseMoved on hover', async () => {
    await clicker.hover('div.tooltip-trigger')

    expect(mockCxn.dispatchMouseEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'mouseMoved',
      x: 150,
      y: 250
    }))
  })

  it('should dispatch rightClick with right button configuration', async () => {
    await clicker.rightClick('div.context-menu')

    expect(mockCxn.dispatchMouseEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'mousePressed',
      button: 'right',
      buttons: 2
    }))
  })

  it('should dispatch doubleClick with clickCount 2', async () => {
    await clicker.doubleClick('span.editable')

    expect(mockCxn.dispatchMouseEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'mousePressed',
      button: 'left',
      clickCount: 2
    }))
  })

  it('should throw error when element cannot be resolved within retries', async () => {
    mockCxn.evaluate.mockResolvedValue({ value: null })

    await expect(clicker.click('button.non-existent'))
      .rejects.toThrow('Element not found: button.non-existent')
  })
})
