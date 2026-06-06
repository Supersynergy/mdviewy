export type SmartReferenceKind = 'url' | 'path' | 'github'

export interface SmartReference {
  kind: SmartReferenceKind
  value: string
  label: string
}

export interface InlineSmartReference extends SmartReference {
  token: string
  start: number
  end: number
}

export interface SmartFileContext {
  path?: string
  name: string
  content?: string
  workspaceRoot?: string
}

export type AgentHandoffTarget = 'claude' | 'codex' | 'review'

const URL_RE = /https?:\/\/[^\s)\]>"']+/gi
const QUOTED_ABS_PATH_RE = /["'`]((?:~|\.{1,2}|\/(?:Users|Volumes|Applications|private|tmp|var|opt|usr|etc))\/[^"'`\n]+)["'`]/g
const INLINE_ABS_PATH_RE = /(^|[\s([{<"'`])((?:~|\.{1,2}|\/(?:Users|Volumes|Applications|private|tmp|var|opt|usr|etc))\/[^\s)\]>"'`]+)(?=$|[\s)\]}> ,;:!?])/gm
const MARKDOWN_LINK_RE = /\[[^\]]+]\(([^)]+)\)/g
const GITHUB_REPO_RE = /(^|[\s([{"'`<])([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])\/[A-Za-z0-9._-]{1,100})(?=$|[\s)\]}",'`>.:;!?])/g

const NON_REPO_OWNERS = new Set([
  'applications',
  'etc',
  'private',
  'tmp',
  'users',
  'usr',
  'var',
  'volumes',
])

const FILE_LIKE_RE = /\.(?:app|css|csv|gif|html?|ico|jpe?g|json|lock|log|md|mjs|pdf|png|py|rs|sh|svg|toml|tsx?|txt|ya?ml|zsh)$/i

export const folderOf = (p?: string) => {
  if (!p) return ''
  const ix = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return ix > 0 ? p.slice(0, ix) : p
}

export const fileNameOf = (p?: string) => {
  if (!p) return ''
  return p.split(/[\\/]/).pop() || p
}

export const markdownLinkForPath = (path?: string, fallbackName = 'file') => {
  if (!path) return ''
  return `[${fileNameOf(path) || fallbackName}](${path})`
}

export const githubUrlForRepoName = (repoName: string) => `https://github.com/${repoName}`

export const stripCodeBlocks = (markdown: string) =>
  markdown.replace(/(^|\n)\s*(```|~~~)[\s\S]*?(\n\s*\2)(?=\n|$)/g, '\n\n[code block hidden]\n\n')

export const buildAiContextPack = (ctx: SmartFileContext, options: { hideCode?: boolean } = {}) => {
  const content = options.hideCode ? stripCodeBlocks(ctx.content || '') : ctx.content || ''
  const path = ctx.path || ctx.name
  const folder = folderOf(ctx.path)

  return [
    '# mdviewy AI Context',
    '',
    `File: ${path}`,
    folder ? `Folder: ${folder}` : undefined,
    ctx.workspaceRoot ? `Workspace: ${ctx.workspaceRoot}` : undefined,
    '',
    '```markdown',
    content,
    '```',
  ]
    .filter((line): line is string => typeof line === 'string')
    .join('\n')
}

export const buildAgentHandoffPrompt = (ctx: SmartFileContext, target: AgentHandoffTarget) => {
  const mention = ctx.path ? `@${ctx.path}` : ctx.name
  const workspace = ctx.workspaceRoot ? `Workspace: ${ctx.workspaceRoot}\n` : ''

  if (target === 'claude') {
    return `${workspace}Read ${mention}. Continue from the current repo state, respect AGENTS.md/CLAUDE.md, and implement the smallest verified fix. Report changed files and verification commands.`
  }

  if (target === 'review') {
    return `${workspace}Review ${mention} in code-review mode. Lead with bugs, regressions, missing tests, and file:line references. Keep summary secondary.`
  }

  return `${workspace}In Codex, inspect ${mention}, make the focused code change, run the repo checks, and leave the worktree clean. Do not revert unrelated user changes.`
}

export const extractSmartReferences = (
  markdown: string,
  context: { currentDir?: string; workspaceRoot?: string; limit?: number } = {},
): SmartReference[] => {
  const limit = Math.max(1, Math.min(context.limit ?? 24, 50))
  const refs: SmartReference[] = []

  const add = (kind: SmartReferenceKind, raw: string) => {
    if (refs.length >= limit) return
    const repoName = kind === 'github' ? normalizeGithubRepoName(raw) : ''
    const value = kind === 'github' ? githubUrlForRepoName(repoName) : normalizeCandidate(raw, context)
    if (!value) return
    if (refs.some((ref) => ref.kind === kind && ref.value === value)) return
    refs.push({ kind, value, label: kind === 'github' ? repoName : createLabel(value) })
  }

  for (const match of markdown.matchAll(URL_RE)) {
    add('url', match[0])
    if (refs.length >= limit) return refs
  }

  for (const match of markdown.matchAll(MARKDOWN_LINK_RE)) {
    const target = match[1]
    if (/^https?:\/\//i.test(target)) add('url', target)
    else add('path', target)
    if (refs.length >= limit) return refs
  }

  for (const match of markdown.matchAll(GITHUB_REPO_RE)) {
    add('github', match[2])
    if (refs.length >= limit) return refs
  }

  for (const match of markdown.matchAll(QUOTED_ABS_PATH_RE)) {
    add('path', match[1])
    if (refs.length >= limit) return refs
  }

  for (const match of markdown.matchAll(INLINE_ABS_PATH_RE)) {
    add('path', match[2])
    if (refs.length >= limit) return refs
  }

  return refs
}

export const collectInlineSmartReferences = (
  text: string,
  context: { currentDir?: string; workspaceRoot?: string; limit?: number } = {},
): InlineSmartReference[] => {
  const limit = Math.max(1, Math.min(context.limit ?? 32, 80))
  const refs: InlineSmartReference[] = []

  const add = (
    kind: SmartReferenceKind,
    raw: string,
    start: number,
    end: number,
  ) => {
    if (refs.length >= limit) return
    const repoName = kind === 'github' ? normalizeGithubRepoName(raw) : ''
    const value = kind === 'github' ? githubUrlForRepoName(repoName) : normalizeCandidate(raw, context)
    if (!value) return
    if (refs.some((ref) => ref.kind === kind && ref.value === value && ref.start === start)) return
    refs.push({
      kind,
      value,
      label: kind === 'github' ? repoName : createLabel(value),
      token: raw,
      start,
      end,
    })
  }

  for (const match of text.matchAll(URL_RE)) {
    const token = match[0]
    add('url', token, match.index, match.index + token.length)
  }

  for (const match of text.matchAll(GITHUB_REPO_RE)) {
    const token = match[2]
    const start = match.index + match[1].length
    add('github', token, start, start + token.length)
  }

  for (const match of text.matchAll(QUOTED_ABS_PATH_RE)) {
    const token = match[1]
    const start = match.index + 1
    add('path', token, start, start + token.length)
  }

  for (const match of text.matchAll(INLINE_ABS_PATH_RE)) {
    const token = match[2]
    const start = match.index + match[1].length
    add('path', token, start, start + token.length)
  }

  return refs.sort((a, b) => a.start - b.start || b.end - a.end)
}

export const findSmartReferenceAroundOffset = (
  text: string,
  offset: number,
  context: { currentDir?: string; workspaceRoot?: string } = {},
): InlineSmartReference | null => {
  return (
    collectInlineSmartReferences(text, context).find(
      (ref) => offset >= ref.start && offset <= ref.end,
    ) ?? null
  )
}

export const findFirstSmartReference = (
  text: string,
  context: { currentDir?: string; workspaceRoot?: string } = {},
): InlineSmartReference | null => {
  return collectInlineSmartReferences(text, context,)[0] ?? null
}

function normalizeCandidate(
  raw: string,
  context: { currentDir?: string; workspaceRoot?: string },
): string {
  const trimmed = raw
    .trim()
    .replace(/[.,;:!?]+$/g, '')
    .replace(/^file:\/\//i, '')

  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/')) return trimmed
  if (trimmed.startsWith('~/')) return trimmed

  if (trimmed.startsWith('./') || trimmed.startsWith('../')) {
    const base = context.currentDir || context.workspaceRoot
    return base ? joinPath(base, trimmed) : trimmed
  }

  if (context.workspaceRoot && /^[\w.-][\w./ -]*$/.test(trimmed) && /\.[a-z0-9]{1,8}$/i.test(trimmed)) {
    return joinPath(context.workspaceRoot, trimmed)
  }

  return ''
}

function normalizeGithubRepoName(raw: string): string {
  const trimmed = raw.trim().replace(/[.,;:!?]+$/g, '')
  const [owner, repo, ...rest] = trimmed.split('/')
  if (!owner || !repo || rest.length > 0) return ''
  if (NON_REPO_OWNERS.has(owner.toLowerCase())) return ''
  if (FILE_LIKE_RE.test(repo)) return ''
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])$/.test(owner)) return ''
  if (!/^[A-Za-z0-9._-]+$/.test(repo)) return ''
  return `${owner}/${repo}`
}

function joinPath(base: string, relative: string) {
  const parts = `${base.replace(/\/+$/g, '')}/${relative}`.split('/')
  const out: string[] = []
  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') out.pop()
    else out.push(part)
  }
  return `/${out.join('/')}`
}

function createLabel(value: string) {
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`
    } catch {
      return value
    }
  }

  const name = fileNameOf(value)
  return name || value
}
