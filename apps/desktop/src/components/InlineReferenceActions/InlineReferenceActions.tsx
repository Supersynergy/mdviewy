import {
  findFirstSmartReference,
  findSmartReferenceAroundOffset,
  fileNameOf,
  folderOf,
  type InlineSmartReference,
} from '@/helper/smartActions'
import { getFileObject } from '@/helper/files'
import { useEditorStore } from '@/stores'
import { invoke } from '@tauri-apps/api/core'
import { homeDir } from '@tauri-apps/api/path'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { Command } from '@tauri-apps/plugin-shell'
import { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { toast } from 'zens'

type HoverState = {
  ref: InlineSmartReference
  rect: DOMRect
}

type InlineContext = {
  currentDir?: string
  workspaceRoot?: string
}

type PathTargetKind = 'file' | 'folder' | 'unknown'

const MARKDOWN_SCOPE = '.markdown-body'
const HIDE_DELAY_MS = 160

const Bar = styled.div<{ $top: number; $left: number }>`
  position: fixed;
  top: ${(p) => p.$top}px;
  left: ${(p) => p.$left}px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 8px;
  border: 1px solid ${(p) => p.theme.borderColor};
  background: ${(p) => p.theme.tipsBgColor};
  box-shadow: 0 8px 24px ${(p) => p.theme.boxShadowColor};
  z-index: 2147483000;
  user-select: none;
`

const ActionButton = styled.button`
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 6px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: ${(p) => p.theme.labelFontColor};
  cursor: pointer;
  font: inherit;

  &:hover {
    color: ${(p) => p.theme.primaryFontColor};
    background: ${(p) => p.theme.hoverColor};
  }
`

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const isPathRef = (ref: InlineSmartReference) => ref.kind === 'path'

const looksLikeFolderPath = (path: string) => {
  if (path.endsWith('/')) return true
  const fileName = fileNameOf(path)
  return Boolean(fileName && !fileName.includes('.'))
}

const getInlineContext = (): InlineContext => {
  const { activeId, getRootPath } = useEditorStore.getState()
  const activeFile = activeId ? getFileObject(activeId) : undefined
  return {
    currentDir: folderOf(activeFile?.path),
    workspaceRoot: getRootPath(),
  }
}

const expandUserPath = async (path: string) => {
  if (!path.startsWith('~/')) return path
  const home = await homeDir()
  return `${home.replace(/\/+$/g, '')}/${path.slice(2)}`
}

const runOpenCommand = async (target: string) => {
  const resolved = await expandUserPath(target)
  const platform = navigator.platform.toLowerCase()
  const program = platform.includes('mac') ? 'open' : platform.includes('win') ? 'cmd' : 'xdg-open'
  const args = platform.includes('win') ? ['/c', 'start', '', resolved] : [resolved]
  const result = await Command.create(program, args).execute()
  if (result.code !== 0) {
    throw new Error(`${program} exited ${result.code}`)
  }
}

const getPathTargetKind = async (
  kind: InlineSmartReference['kind'],
  value: string,
): Promise<PathTargetKind> => {
  if (kind !== 'path') return 'unknown'

  const resolved = await expandUserPath(value)
  try {
    return (await invoke<boolean>('is_dir', { path: resolved })) ? 'folder' : 'file'
  } catch {
    return looksLikeFolderPath(value) ? 'folder' : 'unknown'
  }
}

const openReference = async (ref: InlineSmartReference) => {
  await runOpenCommand(ref.value)
}

const openReferenceFolder = async (ref: InlineSmartReference) => {
  const folder = folderOf(ref.value)
  if (folder) {
    await runOpenCommand(folder)
  }
}

const copyReference = async (ref: InlineSmartReference) => {
  await writeText(ref.value)
  toast.success('Path copied')
}

const getFirstRect = (range: Range): DOMRect | null => {
  const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0)
  return rects[0] ?? null
}

const createRangeFromPoint = (x: number, y: number): Range | null => {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  }

  if (doc.caretRangeFromPoint) {
    return doc.caretRangeFromPoint(x, y)
  }

  const pos = doc.caretPositionFromPoint?.(x, y)
  if (!pos) return null
  const range = document.createRange()
  range.setStart(pos.offsetNode, pos.offset)
  range.collapse(true)
  return range
}

const detectTextReference = (event: PointerEvent, context: InlineContext): HoverState | null => {
  const range = createRangeFromPoint(event.clientX, event.clientY)
  const textNode = range?.startContainer
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE || !textNode.textContent) {
    return null
  }

  const parent = textNode.parentElement
  if (!parent?.closest(MARKDOWN_SCOPE)) {
    return null
  }

  const ref = findSmartReferenceAroundOffset(textNode.textContent, range.startOffset, context)
  if (!ref || !isPathRef(ref)) return null

  const tokenRange = document.createRange()
  tokenRange.setStart(textNode, ref.start)
  tokenRange.setEnd(textNode, ref.end)
  const rect = getFirstRect(tokenRange)
  tokenRange.detach()

  return rect ? { ref, rect } : null
}

const detectElementReference = (target: Element, context: InlineContext): HoverState | null => {
  const element = target.closest('code, a')
  if (!element || !element.closest(MARKDOWN_SCOPE)) {
    return null
  }

  const text = element.textContent || element.getAttribute('href') || ''
  const ref = findFirstSmartReference(text, context)
  if (!ref || !isPathRef(ref)) return null

  return { ref, rect: element.getBoundingClientRect() }
}

const getPosition = (rect: DOMRect, buttonCount: number) => {
  const width = buttonCount * 28 + 8
  const rightSideLeft = rect.right + 7
  const leftSideLeft = rect.left - width - 7
  const left = rightSideLeft + width <= window.innerWidth - 8 ? rightSideLeft : leftSideLeft

  return {
    left: clamp(left, 8, window.innerWidth - width - 8),
    top: clamp(rect.top + rect.height / 2 - 16, 8, window.innerHeight - 40),
  }
}

export function InlineReferenceActions() {
  const [hover, setHover] = useState<HoverState | null>(null)
  const [pathTargetKind, setPathTargetKind] = useState<PathTargetKind>('unknown')
  const hideTimerRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastPointerEventRef = useRef<PointerEvent | null>(null)
  const hoverKind = hover?.ref.kind
  const hoverValue = hover?.ref.value

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const scheduleHide = useCallback(() => {
    cancelHide()
    hideTimerRef.current = window.setTimeout(() => setHover(null), HIDE_DELAY_MS)
  }, [cancelHide])

  useEffect(() => {
    const detect = () => {
      rafRef.current = null
      const event = lastPointerEventRef.current
      const target = event?.target
      if (!event || !(target instanceof Element)) {
        scheduleHide()
        return
      }

      if (target.closest('[data-inline-reference-actions]')) {
        cancelHide()
        return
      }

      const context = getInlineContext()
      const next = detectElementReference(target, context) ?? detectTextReference(event, context)
      if (next) {
        cancelHide()
        setHover(next)
      } else {
        scheduleHide()
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      lastPointerEventRef.current = event
      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(detect)
      }
    }

    document.addEventListener('pointermove', onPointerMove, true)
    document.addEventListener('scroll', scheduleHide, true)
    return () => {
      document.removeEventListener('pointermove', onPointerMove, true)
      document.removeEventListener('scroll', scheduleHide, true)
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
    }
  }, [cancelHide, scheduleHide])

  useEffect(() => {
    let canceled = false
    setPathTargetKind('unknown')

    if (!hoverKind || !hoverValue || hoverKind !== 'path') {
      return () => {
        canceled = true
      }
    }

    getPathTargetKind(hoverKind, hoverValue).then((kind) => {
      if (!canceled) setPathTargetKind(kind)
    })

    return () => {
      canceled = true
    }
  }, [hoverKind, hoverValue])

  if (!hover) return null

  const firstPathButton =
    pathTargetKind === 'folder'
      ? { icon: 'ri-folder-open-line', label: 'Open folder', action: openReference }
      : {
          icon: 'ri-arrow-right-up-line',
          label: pathTargetKind === 'file' ? 'Open file' : 'Open path',
          action: openReference,
        }

  const buttons = [
    firstPathButton,
    { icon: 'ri-folder-open-line', label: 'Open containing folder', action: openReferenceFolder },
    { icon: 'ri-file-copy-line', label: 'Copy path', action: copyReference },
  ]
  const position = getPosition(hover.rect, buttons.length)

  return (
    <Bar
      data-inline-reference-actions
      $top={position.top}
      $left={position.left}
      onPointerEnter={cancelHide}
      onPointerLeave={scheduleHide}
      onMouseDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
    >
      {buttons.map((button) => (
        <ActionButton
          key={button.label}
          type='button'
          title={`${button.label}: ${hover.ref.label}`}
          aria-label={`${button.label}: ${hover.ref.label}`}
          onClick={async (event) => {
            event.preventDefault()
            event.stopPropagation()
            try {
              await button.action(hover.ref)
            } catch (error) {
              toast.error(error instanceof Error ? error.message : String(error))
            }
          }}
        >
          <i aria-hidden='true' className={button.icon} />
        </ActionButton>
      ))}
    </Bar>
  )
}
