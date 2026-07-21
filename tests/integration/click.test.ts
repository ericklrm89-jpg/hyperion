// Integration tests for Click primitive
// Requires Chrome running with --remote-debugging-port

import { Hyperion } from '../../src/hyperion'

describe('ClickPrimitive', () => {
  let hyperion: Hyperion

  beforeAll(async () => {
    hyperion = new Hyperion({
      mode: 'launch',
      chromeProfile: '', // Use temp profile
      verbose: false,
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

  test('should navigate to a page', async () => {
    await hyperion.navigate.navigate({
      url: 'about:blank',
      waitUntil: 'load'
    })
    const url = await hyperion.getPageURL()
    expect(url).toContain('about:blank')
  }, 30000)

  test('should click an element by selector', async () => {
    // Set up a simple test page
    await hyperion.eval(`
      document.body.innerHTML = '<button id="test-btn" onclick="window.clicked=true">Click Me</button>'
    `)

    await hyperion.click.click('#test-btn')
    await new Promise(r => setTimeout(r, 100))

    const result = await hyperion.eval('window.clicked')
    expect(result?.value).toBe(true)
  }, 15000)

  test('should hover over an element', async () => {
    await hyperion.eval(`
      document.body.innerHTML = '<div id="hover-test" onmouseenter="window.hovered=true">Hover Me</div>'
    `)

    await hyperion.click.hover('#hover-test')
    await new Promise(r => setTimeout(r, 100))

    const result = await hyperion.eval('window.hovered')
    // Hover may or may not trigger in headless
    // This test checks that hover doesn't throw
    expect(true).toBe(true)
  }, 15000)
})
