import { ClickPrimitive } from '../../src/primitives/click';

describe('ClickPrimitive - Dual-Tier & Viewport Coordinate Tests', () => {
  let mockCxn: any;
  let clicker: ClickPrimitive;

  beforeEach(() => {
    mockCxn = {
      call: jest.fn().mockResolvedValue({}),
      dispatchMouseEvent: jest.fn().mockResolvedValue({}),
      evaluate: jest.fn().mockImplementation((js: string) => {
        if (js.includes('getBoundingClientRect')) {
          return Promise.resolve({
            value: JSON.stringify({ centerX: 150, centerY: 250 }),
          });
        }
        if (js.includes('dispatchEvent')) {
          return Promise.resolve({
            value: { success: true },
          });
        }
        return Promise.resolve({ value: null });
      }),
    };
    clicker = new ClickPrimitive(mockCxn);
  });

  it('should dispatch mouse pressed and mouse released with viewport coordinates (cdp-first)', async () => {
    const success = await clicker.click('button.submit', { delay: 10 });

    expect(success).toBe(true);
    expect(mockCxn.evaluate).toHaveBeenCalled();
    expect(mockCxn.dispatchMouseEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'mousePressed',
      x: 150,
      y: 250,
      button: 'left',
      clickCount: 1,
      buttons: 1,
    }));
    expect(mockCxn.dispatchMouseEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'mouseReleased',
      x: 150,
      y: 250,
      button: 'left',
      clickCount: 1,
      buttons: 0,
    }));
  });

  it('should execute fastJS directly without CDP mouse dispatch when fastJS is true', async () => {
    const success = await clicker.click('button.fast', { fastJS: true });

    expect(success).toBe(true);
    expect(mockCxn.dispatchMouseEvent).not.toHaveBeenCalled();
    expect(mockCxn.evaluate).toHaveBeenCalledWith(expect.stringContaining('dispatchEvent'));
  });

  it('should execute strategy js-only directly without CDP mouse dispatch', async () => {
    const success = await clicker.click('button.js-only', { strategy: 'js-only' });

    expect(success).toBe(true);
    expect(mockCxn.dispatchMouseEvent).not.toHaveBeenCalled();
    expect(mockCxn.evaluate).toHaveBeenCalledWith(expect.stringContaining('dispatchEvent'));
  });

  it('should fallback to clickJS when CDP coordinates fail', async () => {
    mockCxn.evaluate.mockImplementation((js: string) => {
      if (js.includes('getBoundingClientRect')) {
        return Promise.resolve({ value: null });
      }
      if (js.includes('dispatchEvent')) {
        return Promise.resolve({ value: { success: true } });
      }
      return Promise.resolve({ value: null });
    });

    const success = await clicker.click('button.hidden-in-shadow');

    expect(success).toBe(true);
    expect(mockCxn.evaluate).toHaveBeenCalledWith(expect.stringContaining('dispatchEvent'));
  });

  it('should dispatch mouseMoved on hover', async () => {
    await clicker.hover('div.tooltip-trigger');

    expect(mockCxn.dispatchMouseEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'mouseMoved',
      x: 150,
      y: 250,
    }));
  });

  it('should dispatch rightClick with right button configuration', async () => {
    await clicker.rightClick('div.context-menu');

    expect(mockCxn.dispatchMouseEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'mousePressed',
      button: 'right',
      buttons: 2,
    }));
  });

  it('should dispatch doubleClick with clickCount 2', async () => {
    await clicker.doubleClick('span.editable');

    expect(mockCxn.dispatchMouseEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'mousePressed',
      button: 'left',
      clickCount: 2,
    }));
  });
});
