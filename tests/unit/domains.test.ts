import { Domain, DOMAIN_INIT_ORDER, DOMAIN_METHODS } from '../../src/cdp/domains'

describe('Domains - unit', () => {
  it('should have all required domains', () => {
    expect(Domain.Page).toBe('Page')
    expect(Domain.DOM).toBe('DOM')
    expect(Domain.Runtime).toBe('Runtime')
    expect(Domain.Input).toBe('Input')
    expect(Domain.Network).toBe('Network')
    expect(Domain.Emulation).toBe('Emulation')
    expect(Domain.Target).toBe('Target')
  })

  it('should have init order with stealth awareness', () => {
    expect(DOMAIN_INIT_ORDER.length).toBeGreaterThan(0)

    const pageDomain = DOMAIN_INIT_ORDER.find(d => d.domain === Domain.Page)
    expect(pageDomain).toBeDefined()
    expect(pageDomain!.required).toBe(true)
    expect(pageDomain!.stealthSafe).toBe(true)

    const runtimeDomain = DOMAIN_INIT_ORDER.find(d => d.domain === Domain.Runtime)
    expect(runtimeDomain).toBeDefined()
    expect(runtimeDomain!.stealthSafe).toBe(false) // Runtime.enable is NOT stealth-safe
  })

  it('should have methods for each domain', () => {
    expect(DOMAIN_METHODS[Domain.Page]).toContain('navigate')
    expect(DOMAIN_METHODS[Domain.Page]).toContain('captureScreenshot')
    expect(DOMAIN_METHODS[Domain.Input]).toContain('dispatchMouseEvent')
    expect(DOMAIN_METHODS[Domain.Input]).toContain('dispatchKeyEvent')
    expect(DOMAIN_METHODS[Domain.Input]).toContain('insertText')
    expect(DOMAIN_METHODS[Domain.DOM]).toContain('querySelector')
    expect(DOMAIN_METHODS[Domain.Emulation]).toContain('setAutomationOverride')
  })
})
