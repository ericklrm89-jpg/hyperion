// Integration tests for Screenshot primitive

import { Hyperion } from '../../src/hyperion'

describe('ScreenshotPrimitive', () => {
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

  test('should capture viewport screenshot', async () => {
    await hyperion.navigate.navigate({ url: 'about:blank', waitUntil: 'load' })

    const buf = await hyperion.screenshot.capture({ mode: 'viewport' })
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(100) // PNG has header at minimum
    // PNG magic number
    expect(buf[0]).toBe(0x89)
    expect(buf[1]).toBe(0x50)
    expect(buf[2]).toBe(0x4E)
    expect(buf[3]).toBe(0x47)
  }, 15000)

  test('should capture element screenshot', async () => {
    await hyperion.eval(`
      document.body.innerHTML = '<div id="target" style="width:200px;height:100px;background:red;">Test</div>'
    `)
    await new Promise(r => setTimeout(r, 200))

    const buf = await hyperion.screenshot.capture({
      mode: 'element',
      selector: '#target'
    })
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(100)
  }, 15000)

  test('should capture JPEG screenshot', async () => {
    const buf = await hyperion.screenshot.capture({ format: 'jpeg', quality: 80 })
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(100)
    // JPEG magic number
    expect(buf[0]).toBe(0xFF)
    expect(buf[1]).toBe(0xD8)
  }, 15000)
})
