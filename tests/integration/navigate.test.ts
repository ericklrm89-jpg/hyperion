import { Hyperion } from '../../src/hyperion'

describe('NavigatePrimitive', () => {
  let hyperion: Hyperion

  beforeAll(async () => {
    hyperion = new Hyperion({
      mode: 'launch',
      stealth: {
        runtimeEnable: false,
        automationOverride: true,
        focusEmulation: true,
        zeroJSPatches: true
      }
    })
    await hyperion.connect()
  })

  afterAll(async () => {
    await hyperion.disconnect()
  })

  test('should navigate to URL', async () => {
    await hyperion.navigate.navigate({
      url: 'about:blank',
      waitUntil: 'load'
    })
    const url = await hyperion.getPageURL()
    expect(url).toBe('about:blank')
  }, 15000)

  test('should navigate and get text', async () => {
    await hyperion.eval(`
      document.body.innerHTML = '<h1>Navigation Test</h1><p>Hello World</p>'
    `)

    const text = await hyperion.getPageText()
    expect(text).toContain('Navigation Test')
    expect(text).toContain('Hello World')
  }, 15000)

  test('should wait for selector', async () => {
    // Element already exists from previous test
    const found = await hyperion.navigate.waitForSelector('h1', 5000)
    expect(found).toBe(true)
  }, 10000)

  test('should wait for text', async () => {
    const found = await hyperion.navigate.waitForText('Hello World', 5000)
    expect(found).toBe(true)
  }, 10000)
})
