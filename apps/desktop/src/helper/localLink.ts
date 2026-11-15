import { expandHome, resolveAgainst } from './pathCandidates'

/**
 * Turns an `href` found in a rendered document into an absolute local path —
 * or `null` when the href is not a file (web link, mailto, pure anchor, data
 * URI). Links in a document are almost always relative to the document's own
 * folder, not the process cwd, so resolution needs the open file's path.
 */

const NON_LOCAL = /^(https?:|mailto:|tel:|data:|javascript:|blob:|asset:|tauri:|ipc:)/i

// Any other `scheme:` (obsidian:, vscode:, ftp:, mdviewy:, …) is not a local
// file — single-letter drives (`C:`) are a path, not a scheme.
const EXTERNAL_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]{1,31}:/

export const resolveLocalHref = (href: string, docPath?: string): string | null => {
  const raw = (href || '').trim()
  if (!raw || NON_LOCAL.test(raw)) return null

  // Strip query/hash before decoding so an encoded %23/%3F stays in the name.
  let target = raw.split('#', 1)[0].split('?', 1)[0]
  if (!target) return null

  if (/^file:\/\//i.test(target)) {
    try {
      const url = new URL(target)
      // file://host/… names a remote share — dropping the host would open a
      // same-named local file. Only empty/localhost resolve locally.
      if (url.hostname !== '' && url.hostname !== 'localhost') return null
      target = url.pathname
    } catch {
      return null
    }
  } else if (EXTERNAL_SCHEME.test(target)) {
    return null
  }

  try {
    target = decodeURIComponent(target)
  } catch {
    // Percent escapes are optional; a literal `%` in a name must not kill it.
  }

  const home = docPath?.match(/^\/Users\/[^/]+/)?.[0]
  target = expandHome(target, home)

  // Without a saved document path there is no anchor for a relative link —
  // resolving against process cwd could open a same-named foreign file.
  const isRelative = !/^([a-zA-Z]:[\\/]|\\\\|\/|~)/.test(target)
  if (isRelative && !docPath) return null

  const baseDir = docPath ? docPath.replace(/[\\/][^\\/]*$/, '') : undefined
  return resolveAgainst(target, baseDir)
}

/**
 * Extensions whose default system handler executes content rather than
 * displaying it. Opening these via `openPath` after one click in a hostile
 * document is code execution — block them at the open boundary instead.
 * `.sh`/`.py`/etc. are deliberately absent: they are supported source types
 * and open inside the app before this check is ever reached.
 */
const EXECUTE_ON_OPEN = /\.(command|tool|scpt|scptd|applescript|workflow|app|pkg|mpkg|dmg|exe|msi|bat|cmd|com|scr|vbs|wsf|ps1|jar|lnk|pif|osx)$/i

export const isDangerousExecPath = (path: string) => EXECUTE_ON_OPEN.test(path.trim())
