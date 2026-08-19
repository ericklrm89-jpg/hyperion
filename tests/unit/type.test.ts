import { TypePrimitive } from '../../src/primitives/type'

describe('TypePrimitive - Real CDP Dispatch Tests', () => {
  let mockCxn: any
  let typer: TypePrimitive

  beforeEach(() => {
    mockCxn = {
      call: jest.fn().mockResolvedValue({}),
      evaluate: jest.fn().mockImplementation((js: string) => {
        if (js.includes('focus()')) return Promise.resolve({ value: true })
        if (js.includes('tagName')) return Promise.resolve({ value: 'input' })
        return Promise.resolve({ value: true })
      }),
      dispatchKeyEvent: jest.fn().mockResolvedValue({}),
      insertText: jest.fn().mockResolvedValue({}),
    }
    typer = new TypePrimitive(mockCxn)
  })

  it('should focus element and use fast-path insertText when humanLike is false', async () => {
    await typer.type('input#username', 'hello@test.com', { humanLike: false })

    expect(mockCxn.evaluate).toHaveBeenCalled()
    expect(mockCxn.insertText).toHaveBeenCalledWith('hello@test.com')
  })

  it('should use pasteText when text length exceeds pasteThreshold', async () => {
    const longText = 'A'.repeat(150)
    await typer.type('textarea#notes', longText, { pasteThreshold: 100 })

    expect(mockCxn.evaluate).toHaveBeenCalled()
    expect(mockCxn.insertText).toHaveBeenCalledWith(longText)
  })

  it('should dispatch human-like key strokes when humanLike is true', async () => {
    await typer.type('input#search', 'AI', {
      humanLike: true,
      errorRate: 0,
      delayMin: 1,
      delayMax: 5
    })

    expect(mockCxn.dispatchKeyEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'char',
      text: 'A'
    }))
    expect(mockCxn.dispatchKeyEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'char',
      text: 'I'
    }))
  })

  it('should clear field before typing when clearField is true', async () => {
    await typer.type('input#email', 'new@email.com', { clearField: true, humanLike: false })

    expect(mockCxn.evaluate).toHaveBeenCalledWith(expect.stringContaining("el.value = ''"))
    expect(mockCxn.insertText).toHaveBeenCalledWith('new@email.com')
  })
})
