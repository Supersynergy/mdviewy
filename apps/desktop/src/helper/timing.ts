type AnyFunction = (...args: any[]) => any

export interface DebouncedFunc<T extends AnyFunction> {
  (...args: Parameters<T>): void
  cancel: () => void
  flush: () => ReturnType<T> | undefined
}

export interface ThrottleOptions {
  leading?: boolean
  trailing?: boolean
}

export function debounce<T extends AnyFunction>(fn: T, wait: number): DebouncedFunc<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  let lastArgs: Parameters<T> | undefined
  let lastThis: ThisParameterType<T> | undefined
  let result: ReturnType<T> | undefined

  const invoke = () => {
    timeout = undefined
    if (!lastArgs) return result

    result = fn.apply(lastThis, lastArgs)
    lastArgs = undefined
    lastThis = undefined
    return result
  }

  const debounced = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    lastArgs = args
    lastThis = this

    if (timeout !== undefined) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(invoke, wait)
  } as DebouncedFunc<T>

  debounced.cancel = () => {
    if (timeout !== undefined) {
      clearTimeout(timeout)
    }

    timeout = undefined
    lastArgs = undefined
    lastThis = undefined
  }

  debounced.flush = () => {
    if (timeout === undefined) return result

    clearTimeout(timeout)
    return invoke()
  }

  return debounced
}

export function throttle<T extends AnyFunction>(
  fn: T,
  wait: number,
  options: ThrottleOptions = {},
): DebouncedFunc<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  let lastCallTime: number | undefined
  let lastArgs: Parameters<T> | undefined
  let lastThis: ThisParameterType<T> | undefined
  let result: ReturnType<T> | undefined

  const leading = options.leading !== false
  const trailing = options.trailing !== false

  const invoke = (time: number) => {
    lastCallTime = time
    result = fn.apply(lastThis, lastArgs as Parameters<T>)
    lastArgs = undefined
    lastThis = undefined
    return result
  }

  const startTimer = (remaining: number) => {
    timeout = setTimeout(() => {
      timeout = undefined
      if (trailing && lastArgs) {
        invoke(leading ? Date.now() : 0)
      } else if (!leading) {
        lastCallTime = undefined
      }
    }, remaining)
  }

  const throttled = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const now = Date.now()

    if (lastCallTime === undefined && !leading) {
      lastCallTime = now
    }

    lastArgs = args
    lastThis = this

    if (lastCallTime === undefined) {
      return invoke(now)
    }

    const remaining = wait - (now - lastCallTime)

    if (remaining <= 0 || remaining > wait) {
      if (timeout !== undefined) {
        clearTimeout(timeout)
        timeout = undefined
      }
      return invoke(now)
    }

    if (timeout === undefined && trailing) {
      startTimer(remaining)
    }

    return result
  } as DebouncedFunc<T>

  throttled.cancel = () => {
    if (timeout !== undefined) {
      clearTimeout(timeout)
    }

    timeout = undefined
    lastCallTime = undefined
    lastArgs = undefined
    lastThis = undefined
  }

  throttled.flush = () => {
    if (timeout === undefined || !lastArgs) return result

    clearTimeout(timeout)
    timeout = undefined
    return invoke(Date.now())
  }

  return throttled
}
