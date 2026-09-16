import { expandHome, resolveAgainst } from './pathCandidates'

/**
 * Turns an `href` found in a rendered document into an absolute local path —
 * or `null` when the href is not a file (web link, mailto, pure anchor, data
 * URI). Links in a document are almost always relative to the document's own
 * folder, not the process cwd, so resolution needs the open file's path.
 */

const NON_LOCAL = /^(https?:|mailto:|tel:|data:|javascript:|blob:|asset:|tauri:|ipc:)/i

export const resolveLocalHref = (href: string, docPath?: string): string | null => {
  const raw = (href || '').trim()
  if (!raw || NON_LOCAL.test(raw)) return null

  let target = raw
  if (/^file:\/\//i.test(target)) {
    try {
      target = decodeURIComponent(new URL(target).pathname)
    } catch {
      return null
    }
  }

  target = target.split('#', 1)[0].split('?', 1)[0]
  if (!target) return null

  try {
    target = decodeURIComponent(target)
  } catch {
    // Percent escapes are optional; a literal `%` in a name must not kill it.
  }

  const home = docPath?.match(/^\/Users\/[^/]+/)?.[0]
  target = expandHome(target, home)

  const baseDir = docPath ? docPath.replace(/\/[^/]*$/, '') : undefined
  return resolveAgainst(target, baseDir)
}
