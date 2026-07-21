import { ClickPrimitive } from '../../src/primitives/click'

describe('ClickPrimitive - unit', () => {
  it('should exist and have required methods', () => {
    // Just verify the class compiles and exports correctly
    expect(ClickPrimitive).toBeDefined()
    expect(ClickPrimitive.prototype.click).toBeDefined()
    expect(ClickPrimitive.prototype.hover).toBeDefined()
    expect(ClickPrimitive.prototype.rightClick).toBeDefined()
    expect(ClickPrimitive.prototype.doubleClick).toBeDefined()
    expect(ClickPrimitive.prototype.clickAt).toBeDefined()
  })
})
