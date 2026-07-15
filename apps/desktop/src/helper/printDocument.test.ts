import { afterEach, describe, expect, it, vi } from 'vitest'
import { PRINT_BODY_CLASS, printActiveDocument } from './printDocument'

describe('printActiveDocument', () => {
  afterEach(() => {
    document.body.classList.remove(PRINT_BODY_CLASS)
    Reflect.deleteProperty(window, 'print')
    vi.restoreAllMocks()
  })

  it('isolates the active document until printing finishes', () => {
    const print = vi.fn()
    Object.defineProperty(window, 'print', { configurable: true, value: print })

    printActiveDocument()

    expect(print).toHaveBeenCalledTimes(1)
    expect(document.body.classList.contains(PRINT_BODY_CLASS)).toBe(true)

    window.dispatchEvent(new Event('afterprint'))
    expect(document.body.classList.contains(PRINT_BODY_CLASS)).toBe(false)
  })

  it('cleans up when the webview rejects printing', () => {
    Object.defineProperty(window, 'print', { configurable: true, value: () => {
      throw new Error('print unavailable')
    } })

    expect(() => printActiveDocument()).toThrow('print unavailable')
    expect(document.body.classList.contains(PRINT_BODY_CLASS)).toBe(false)
  })
})
