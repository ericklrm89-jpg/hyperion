// Integration tests for Type primitive

import { Hyperion } from '../../src/hyperion'

describe('TypePrimitive', () => {
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

  test('should type into an input field', async () => {
    await hyperion.eval(`
      document.body.innerHTML = '<input id="test-input" />'
    `)

    await hyperion.type.type('#test-input', 'Hello World', { humanLike: false })
    await new Promise(r => setTimeout(r, 100))

    const result = await hyperion.eval('document.getElementById("test-input").value')
    expect(result?.value).toBe('Hello World')
  }, 15000)

  test('should type with human-like delays', async () => {
    await hyperion.eval(`
      document.body.innerHTML = '<input id="human-input" />'
    `)

    await hyperion.type.type('#human-input', 'Test', { humanLike: true, delayMin: 10, delayMax: 30 })
    await new Promise(r => setTimeout(r, 200))

    const result = await hyperion.eval('document.getElementById("human-input").value')
    expect(result?.value).toBe('Test')
  }, 15000)

  test('should clear field before typing', async () => {
    await hyperion.eval(`
      document.body.innerHTML = '<input id="clear-input" value="old value" />'
    `)

    await hyperion.type.type('#clear-input', 'new value', { clearField: true, humanLike: false })
    await new Promise(r => setTimeout(r, 100))

    const result = await hyperion.eval('document.getElementById("clear-input").value')
    expect(result?.value).toBe('new value')
  }, 15000)

  test('should type into contenteditable', async () => {
    await hyperion.eval(`
      document.body.innerHTML = '<div id="ce" contenteditable="true"></div>'
    `)

    await hyperion.type.type('#ce', 'editable text', { humanLike: false })
    await new Promise(r => setTimeout(r, 100))

    const result = await hyperion.eval('document.getElementById("ce").textContent')
    expect(result?.value?.trim()).toBe('editable text')
  }, 15000)
})
