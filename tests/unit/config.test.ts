import { DEFAULT_CONFIG, TimeoutError, TargetClosedError, NotAttachedError } from '../../src/config'

describe('Config - unit', () => {
  it('should have default config', () => {
    expect(DEFAULT_CONFIG).toBeDefined()
    expect(DEFAULT_CONFIG.mode).toBe('extension')
    expect(DEFAULT_CONFIG.timeout).toBe(30000)
    expect(DEFAULT_CONFIG.stealth.runtimeEnable).toBe(false)
    expect(DEFAULT_CONFIG.stealth.automationOverride).toBe(true)
    expect(DEFAULT_CONFIG.stealth.focusEmulation).toBe(true)
    expect(DEFAULT_CONFIG.stealth.zeroJSPatches).toBe(true)
  })

  it('should create TimeoutError', () => {
    const err = new TimeoutError('Page.navigate', 30000)
    expect(err.message).toContain('Page.navigate')
    expect(err.message).toContain('30000')
    expect(err.name).toBe('TimeoutError')
  })

  it('should create TargetClosedError', () => {
    const err = new TargetClosedError()
    expect(err.message).toBe('Target closed')
    expect(err.name).toBe('TargetClosedError')
  })

  it('should create NotAttachedError', () => {
    const err = new NotAttachedError()
    expect(err.message).toBe('Not attached to target')
    expect(err.name).toBe('NotAttachedError')
  })
})
