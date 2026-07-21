import { TypePrimitive } from '../../src/primitives/type'

describe('TypePrimitive - unit', () => {
  it('should exist and have required methods', () => {
    expect(TypePrimitive).toBeDefined()
    expect(TypePrimitive.prototype.type).toBeDefined()
  })

  it('should have correct type options interface', () => {
    const options = {
      humanLike: true,
      pasteThreshold: 100,
      errorRate: 0.03,
      delayMin: 30,
      delayMax: 120,
      clearField: false
    }
    expect(options.humanLike).toBe(true)
    expect(options.pasteThreshold).toBe(100)
    expect(options.errorRate).toBe(0.03)
  })
})
