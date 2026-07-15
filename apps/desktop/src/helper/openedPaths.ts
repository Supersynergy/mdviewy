export type OpenedUrlsPayload = string | string[] | null | undefined

export function parseOpenedEvent(event: unknown): string[] {
  if (!event || typeof event !== 'object' || !('payload' in event)) return []
  return parseOpenedPaths((event as { payload?: OpenedUrlsPayload }).payload)
}

export function normalizeOpenedPath(value: string, options?: { decodeNativePath?: boolean }): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  let path = trimmed
  let shouldDecode = options?.decodeNativePath ?? true

  if (/^file:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname
    } catch {
      path = path.slice('file://'.length)
    }
    shouldDecode = true
  }

  if (shouldDecode) {
    try {
      path = decodeURIComponent(path)
    } catch {
      path = path.replace(/%20/g, ' ')
    }
  }

  return path || null
}

export function parseOpenedPaths(payload: OpenedUrlsPayload): string[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => {
      const path = normalizeOpenedPath(item, { decodeNativePath: false })
      return path ? [path] : []
    })
  }

  if (typeof payload !== 'string') return []

  const trimmed = payload.trim()
  if (!trimmed) return []

  if (trimmed.startsWith('[') || trimmed.startsWith('"')) {
    try {
      return parseOpenedPaths(JSON.parse(trimmed) as OpenedUrlsPayload)
    } catch {
      // Fall through to legacy comma-separated payloads.
    }
  }

  return trimmed.split(',').flatMap((item) => {
    const path = normalizeOpenedPath(item)
    return path ? [path] : []
  })
}
