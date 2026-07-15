import { getFolderPathFromPath, getFileNameFromPath } from '@/helper/filesys'
import { addExistingMarkdownFileEdit } from '@/services/editor-file'
import { getFileContent } from '@/services/file-info'
import { convertFileSrc } from '@tauri-apps/api/core'
import { openPath, openUrl } from '@tauri-apps/plugin-opener'
import DOMPurify from 'dompurify'
import { marked, Renderer } from 'marked'
import { useMemo, type MouseEvent } from 'react'
import styled from 'styled-components'

const WEB_URL = /^(https?:|mailto:)/i
const NON_FILE_URL = /^(data:|blob:|asset:|tauri:)/i
const ALERT_LABELS = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
} as const

export function githubHeadingId(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
}

export function requiresSourceSafeEditing(markdown: string): boolean {
  return (
    /^\s*<(?:details|summary|div|table|picture|source|video|kbd|img|br)\b/im.test(markdown) ||
    /^\s*>\s*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/m.test(markdown) ||
    /\[\^[^\]]+\]/.test(markdown) ||
    /^\s*- \[X\]/m.test(markdown)
  )
}

export function resolveReadmeAsset(filePath: string | undefined, target: string): string {
  if (!target || WEB_URL.test(target) || NON_FILE_URL.test(target) || target.startsWith('#')) {
    return target
  }
  if (/^(?:[A-Za-z]:[\\/]|[\\/]{2})/.test(target) || target.startsWith('/')) return target

  const base = getFolderPathFromPath(filePath) || ''
  const separator = base.includes('\\') ? '\\' : '/'
  const prefix = /^[A-Za-z]:/.exec(base)?.[0] || (base.startsWith(separator) ? separator : '')
  const parts = `${base}${separator}${target.split(/[?#]/, 1)[0]}`.split(/[\\/]+/)
  const normalized: string[] = []

  for (const part of parts) {
    if (!part || part === '.' || part === prefix) continue
    if (part === '..') normalized.pop()
    else normalized.push(part)
  }

  return `${prefix}${prefix && prefix !== separator ? separator : ''}${normalized.join(separator)}`
}

export function GitHubMarkdownPreview({ content, filePath }: Props) {
  const html = useMemo(() => {
    const renderer = new Renderer()
    const headingCounts = new Map<string, number>()
    renderer.heading = function ({ depth, tokens }) {
      const innerHtml = this.parser.parseInline(tokens)
      const text = tokens.map((token) => 'text' in token ? token.text : token.raw).join('')
      const baseId = githubHeadingId(text)
      const count = headingCounts.get(baseId) || 0
      headingCounts.set(baseId, count + 1)
      const id = count === 0 ? baseId : `${baseId}-${count}`
      return `<h${depth} id="${id}">${innerHtml}</h${depth}>\n`
    }

    const unsafeHtml = marked.parse(content, { async: false, gfm: true, renderer }) as string
    const cleanHtml = DOMPurify.sanitize(unsafeHtml, {
      ADD_ATTR: ['align', 'checked', 'disabled', 'target', 'rel'],
      ADD_TAGS: ['details', 'summary', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['srcdoc'],
    })
    const parsed = new DOMParser().parseFromString(cleanHtml, 'text/html')

    parsed
      .querySelectorAll('script, style, iframe, object, embed, form')
      .forEach((element) => element.remove())
    parsed.querySelectorAll('*').forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        if (attribute.name.startsWith('on') || attribute.name === 'srcdoc') {
          element.removeAttribute(attribute.name)
        }
      })
    })

    parsed.querySelectorAll('blockquote').forEach((blockquote) => {
      const firstParagraph = blockquote.firstElementChild
      if (firstParagraph?.tagName !== 'P') return
      const match = firstParagraph.textContent?.match(
        /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i,
      )
      if (!match) return

      const type = match[1].toLocaleLowerCase() as keyof typeof ALERT_LABELS
      const textNode = Array.from(firstParagraph.childNodes).find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.includes(match[0].trim()),
      )
      if (textNode) textNode.textContent = textNode.textContent?.replace(match[0], '') || ''

      blockquote.classList.add('markdown-alert', `markdown-alert-${type}`)
      const title = parsed.createElement('p')
      title.className = 'markdown-alert-title'
      title.textContent = ALERT_LABELS[type]
      blockquote.insertBefore(title, firstParagraph)
    })

    parsed.querySelectorAll('img').forEach((image) => {
      const src = image.getAttribute('src') || ''
      const localPath = resolveReadmeAsset(filePath, src)
      if (localPath && !WEB_URL.test(localPath) && !NON_FILE_URL.test(localPath)) {
        image.setAttribute('src', convertFileSrc(localPath))
      }
      image.setAttribute('loading', 'lazy')
    })

    return parsed.body.innerHTML
  }, [content, filePath])

  const handleLink = async (event: MouseEvent<HTMLElement>) => {
    const anchor = (event.target as Element).closest('a')
    if (!anchor || !event.currentTarget.contains(anchor)) return
    event.preventDefault()
    const href = anchor.getAttribute('href') || ''

    try {
      if (href.startsWith('#')) {
        document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' })
        return
      }
      if (WEB_URL.test(href)) {
        await openUrl(href)
        return
      }

      const localPath = resolveReadmeAsset(filePath, href)
      if (/\.md(?:own)?$/i.test(localPath.split(/[?#]/, 1)[0])) {
        const markdown = await getFileContent({ filePath: localPath })
        if (markdown === null) return
        await addExistingMarkdownFileEdit({
          fileName: getFileNameFromPath(localPath) || 'README.md',
          content: markdown,
          path: localPath,
        })
        return
      }
      if (localPath) await openPath(localPath)
    } catch (error) {
      console.error('[mdviewy] Could not open README link', error)
    }
  }

  return (
    <PreviewSurface
      data-testid='github-markdown-preview'
      onClick={handleLink}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

type Props = {
  content: string
  filePath?: string
}

const PreviewSurface = styled.article`
  width: 100%;
  min-width: 0;
  padding: 8px 0 64px;
  overflow-wrap: anywhere;

  a {
    color: ${({ theme }) => theme.accentColor};
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.16em;
  }

  input[type='checkbox'] {
    margin-right: 0.45em;
  }

  details {
    margin: 0.75em 0;
    padding: 0.65em 0.85em;
    border: 1px solid ${({ theme }) => theme.borderColor};
    border-radius: 8px;
  }

  summary {
    cursor: pointer;
    font-weight: 600;
  }

  .markdown-alert {
    --alert-color: #0969da;
    margin: 1em 0;
    padding: 0.25em 1em;
    border-left: 4px solid var(--alert-color);
    color: inherit;
  }

  .markdown-alert-title {
    margin: 0.25em 0;
    color: var(--alert-color);
    font-weight: 600;
  }

  .markdown-alert-tip { --alert-color: #1a7f37; }
  .markdown-alert-important { --alert-color: #8250df; }
  .markdown-alert-warning { --alert-color: #9a6700; }
  .markdown-alert-caution { --alert-color: #cf222e; }
`
