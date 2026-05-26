import { afterEach, describe, expect, it, vi } from 'vitest'
import { debounce, throttle } from './timing'

describe('timing helpers', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces calls and can cancel a pending call', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('first')
    debounced('second')
    vi.advanceTimersByTime(99)

    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('second')

    debounced('third')
    debounced.cancel()
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('throttles leading-only calls', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const throttled = throttle(fn, 100, { leading: true, trailing: false })

    throttled('first')
    throttled('second')
    vi.advanceTimersByTime(99)
    throttled('third')

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('first')

    vi.advanceTimersByTime(1)
    throttled('fourth')

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('fourth')
  })
})
