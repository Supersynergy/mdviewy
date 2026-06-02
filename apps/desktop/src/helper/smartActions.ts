export type SmartReferenceKind = 'url' | 'path'

export interface SmartReference {
  kind: SmartReferenceKind
  value: string
  label: string
}

export interface SmartFileContext {
  path?: string
  name: string
  content?: string
  workspaceRoot?: string
}

const URL_RE = /https?:\/\/[^\s)\]>"']+/gi
const QUOTED_ABS_PATH_RE = /["'`](\/(?:Users|Volumes|Applications|private|tmp|var|opt|usr|etc)\/[^"'`\n]+)["'`]/g
const INLINE_ABS_PATH_RE = /(^|[\s([{<])((?:~|\.{1,2}|\/(?:Users|Volumes|Applications|private|tmp|var|opt|usr|etc))\/[^\s)\]>"'`]+)(?=$|[\s)\]}>.,;:!?])/gm
const MARKDOWN_LINK_RE = /\[[^\]]+]\(([^)]+)\)/g

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

export const stripCodeBlocks = (markdown: string) =>
  markdown.replace(/(^|\n)\s*(```|~~~)[\s\S]*?(\n\s*\2)(?=\n|$)/g, '\n\n[code block hidden]\n\n')

export const buildAiContextPack = (ctx: SmartFileContext, options: { hideCode?: boolean } = {}) => {
  const content = options.hideCode ? stripCodeBlocks(ctx.content || '') : ctx.content || ''
  const path = ctx.path || ctx.name
  const folder = folderOf(ctx.path)

  return [
    '# MDviewy AI Context',
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

export const extractSmartReferences = (
  markdown: string,
  context: { currentDir?: string; workspaceRoot?: string } = {},
): SmartReference[] => {
  const refs: SmartReference[] = []

  const add = (kind: SmartReferenceKind, raw: string) => {
    const value = normalizeCandidate(raw, context)
    if (!value) return
    if (refs.some((ref) => ref.kind === kind && ref.value === value)) return
    refs.push({ kind, value, label: createLabel(value) })
  }

  for (const match of markdown.matchAll(URL_RE)) {
    add('url', match[0])
  }

  for (const match of markdown.matchAll(MARKDOWN_LINK_RE)) {
    const target = match[1]
    if (/^https?:\/\//i.test(target)) add('url', target)
    else add('path', target)
  }

  for (const match of markdown.matchAll(QUOTED_ABS_PATH_RE)) {
    add('path', match[1])
  }

  for (const match of markdown.matchAll(INLINE_ABS_PATH_RE)) {
    add('path', match[2])
  }

  return refs.slice(0, 24)
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
