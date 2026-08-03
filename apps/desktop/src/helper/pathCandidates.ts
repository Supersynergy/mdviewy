/**
 * Finds file paths inside document text so the menu can act on them —
 * "Reveal in Finder" for the path under the pointer, not just for the file
 * that happens to be open.
 */

const WRAPPERS = /^[("'`<[{]+|[)"'`>\]},.;:!?]+$/g

const PATH_PATTERN = /(?:~|\.{1,2})?\/[^\s"'`<>|]+|[A-Za-z]:\\[^\s"'`<>|]+/g

/** Strips Markdown/prose punctuation that clings to a pasted path. */
export const trimPathCandidate = (value: string): string => value.replace(WRAPPERS, '').trim()

const looksLikePath = (value: string) =>
  value.length > 1 && !value.startsWith('//') && !/^https?:/i.test(value)

/**
 * Extracts path-like tokens, most specific first, without touching the disk.
 * `limit` keeps a pasted log from turning into a hundred menu entries.
 */
export const findPathCandidates = (text: string, limit = 5): string[] => {
  if (!text) return []

  const found = new Set<string>()

  for (const match of text.match(PATH_PATTERN) ?? []) {
    const candidate = trimPathCandidate(match)
    if (looksLikePath(candidate)) found.add(candidate)
    if (found.size >= limit) break
  }

  return [...found]
}

/** Turns `~/notes/a.md` into an absolute path when the home directory is known. */
export const expandHome = (value: string, home?: string): string => {
  if (!home) return value
  if (value === '~') return home
  if (value.startsWith('~/')) return `${home.replace(/\/$/, '')}/${value.slice(2)}`
  return value
}

/** Resolves a relative path against the folder of the current document. */
export const resolveAgainst = (value: string, baseDir?: string): string => {
  if (!baseDir || value.startsWith('/') || /^[A-Za-z]:\\/.test(value) || value.startsWith('~')) {
    return value
  }

  const base = baseDir.replace(/\/$/, '')
  const parts = `${base}/${value}`.split('/')
  const resolved: string[] = []

  for (const part of parts) {
    if (part === '.' || part === '') continue
    if (part === '..') resolved.pop()
    else resolved.push(part)
  }

  return `/${resolved.join('/')}`
}

/** Display name for a path — the last segment, or the path itself. */
export const pathLabel = (value: string): string => value.split(/[\\/]/).filter(Boolean).pop() || value
