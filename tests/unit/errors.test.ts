import { CDP_ERROR_CODES, isTargetClosed, isNotAttached, isRetryableError } from '../../src/cdp/errors'

describe('CDP Errors - unit', () => {
  it('should have correct error codes', () => {
    expect(CDP_ERROR_CODES.NOT_IMPLEMENTED).toBe(-32000)
    expect(CDP_ERROR_CODES.TARGET_CLOSED).toBe(-32001)
    expect(CDP_ERROR_CODES.NOT_ATTACHED).toBe(-32002)
    expect(CDP_ERROR_CODES.METHOD_NOT_FOUND).toBe(-32601)
    expect(CDP_ERROR_CODES.INTERNAL_ERROR).toBe(-32603)
  })

  it('should detect target closed', () => {
    expect(isTargetClosed({ code: -32001, message: 'Target closed' })).toBe(true)
    expect(isTargetClosed({ code: -32000 })).toBe(false)
    expect(isTargetClosed(null)).toBe(false)
  })

  it('should detect not attached', () => {
    expect(isNotAttached({ code: -32002, message: 'Not attached' })).toBe(true)
    expect(isNotAttached({ code: -32001 })).toBe(false)
    expect(isNotAttached(undefined)).toBe(false)
  })

  it('should detect retryable errors', () => {
    expect(isRetryableError({ code: -32001 })).toBe(true) // Target closed
    expect(isRetryableError({ code: -32002 })).toBe(true) // Not attached
    expect(isRetryableError({ code: -32603 })).toBe(true) // Internal error
    expect(isRetryableError({ code: -32601 })).toBe(false) // Method not found
    expect(isRetryableError({})).toBe(false)
    expect(isRetryableError(null)).toBe(false)
  })
})
