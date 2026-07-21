export const CDP_ERROR_CODES = {
  NOT_IMPLEMENTED: -32000,
  TARGET_CLOSED: -32001,
  NOT_ATTACHED: -32002,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const

export function isTargetClosed(err: any): boolean {
  return err?.code === CDP_ERROR_CODES.TARGET_CLOSED
}

export function isNotAttached(err: any): boolean {
  return err?.code === CDP_ERROR_CODES.NOT_ATTACHED
}

export function isRetryableError(err: any): boolean {
  if (!err?.code) return false
  return [
    CDP_ERROR_CODES.TARGET_CLOSED,
    CDP_ERROR_CODES.NOT_ATTACHED,
    CDP_ERROR_CODES.INTERNAL_ERROR
  ].includes(err.code)
}
