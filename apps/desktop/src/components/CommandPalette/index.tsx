import { pathEntries } from '@/helper/files'
import { useEditorStore } from '@/stores'
import useCommandStore from '@/stores/useCommandStore'
import { invoke } from '@tauri-apps/api/core'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Backdrop,
  Empty,
  FooterHint,
  Item,
  ItemMeta,
  ItemTitle,
  ModeBar,
  ModePill,
  Panel,
  SearchInput,
} from './styles'

type Mode = 'all' | 'files' | 'content' | 'commands'

export type CommandPaletteOpenRequest = {
  mode: Mode
  nonce: number
}

type CommandPaletteProps = {
  openRequest?: CommandPaletteOpenRequest | null
  onReady?: () => void
}

type Entry = {
  kind: 'file' | 'command' | 'recent' | 'content'
  id: string
  title: string
  subtitle?: string
  exec: () => void
  score: number
}

type ContentMatch = {
  id: string
  path: string
  relative_path: string
  matches: { id: string; line: number; content: string }[]
}

const fuzzyScore = (text: string, q: string): number => {
  if (!q) return 1
  const t = text.toLowerCase()
  const query = q.toLowerCase()
  if (t.includes(query)) return 100 - t.indexOf(query) * 0.5
  let ti = 0
  let qi = 0
  let score = 0
  let lastMatch = -2
  while (ti < t.length && qi < query.length) {
    if (t[ti] === query[qi]) {
      score += ti - lastMatch === 1 ? 3 : 1
      lastMatch = ti
      qi++
    }
    ti++
  }
  return qi === query.length ? score : 0
}

const isMode = (value: unknown): value is Mode =>
  value === 'all' || value === 'files' || value === 'content' || value === 'commands'

const CommandPalette = memo(({ openRequest, onReady }: CommandPaletteProps) => {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('all')
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [contentMatches, setContentMatches] = useState<ContentMatch[]>([])
  const [contentLoading, setContentLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const contentTimerRef = useRef<number | null>(null)
  const { addOpenedFile, setActiveId, opened, folderData } = useEditorStore()
  const commands = useCommandStore((s) => s.commands)

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActiveIdx(0)
  }, [])

  useEffect(() => {
    onReady?.()
  }, [onReady])

  useEffect(() => {
    if (!openRequest) return
    setMode(openRequest.mode)
    setOpen(true)
  }, [openRequest])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k' && !e.shiftKey) {
        e.preventDefault()
        setMode('all')
        setOpen((v) => !v)
      } else if (mod && e.key.toLowerCase() === 'p' && !e.shiftKey) {
        e.preventDefault()
        setMode('files')
        setOpen(true)
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setMode('commands')
        setOpen(true)
      }
    }
    const externalOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setMode(isMode(detail) ? detail : 'all')
      setOpen(true)
    }
    window.addEventListener('keydown', handler)
    window.addEventListener('mf:cmd_palette:open', externalOpen as EventListener)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('mf:cmd_palette:open', externalOpen as EventListener)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    if (contentTimerRef.current) window.clearTimeout(contentTimerRef.current)
    const q = query.trim()
    const wantContent = mode === 'all' || mode === 'content'
    if (!open || !wantContent || q.length < 2 || !folderData?.[0]) {
      setContentMatches([])
      setContentLoading(false)
      return
    }
    setContentLoading(true)
    contentTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await invoke<{ data: ContentMatch[] }>('search_files_async', {
          query: { dir: folderData[0].path, name_text: '.md', contents_text: q },
          options: { content_case_sensitive: false },
        })
        setContentMatches(res.data || [])
      } catch {
        setContentMatches([])
      } finally {
        setContentLoading(false)
      }
    }, 220)
    return () => {
      if (contentTimerRef.current) window.clearTimeout(contentTimerRef.current)
    }
  }, [open, mode, query, folderData])

  const entries = useMemo<Entry[]>(() => {
    if (!open) return []
    const out: Entry[] = []
    const wantFiles = mode === 'all' || mode === 'files'
    const wantCmds = mode === 'all' || mode === 'commands'
    const q = query.trim()

    if (q.length === 0) {
      if (wantFiles) {
        for (let i = opened.length - 1; i >= 0; i--) {
          const id = opened[i]
          const f = Object.values(pathEntries).find((x) => x && x.id === id)
          if (!f) continue
          const title = f.name || f.path?.split('/').pop() || ''
          out.push({
            kind: 'recent',
            id,
            title,
            subtitle: f.path,
            exec: () => {
              addOpenedFile(id)
              setActiveId(id)
            },
            score: 1000 - i,
          })
        }
      }
      return out.slice(0, 20)
    }
    if (q.length < 2) return []

    if (wantFiles) {
      const files = Object.values(pathEntries).filter((f) => f && f.kind !== 'dir')
      for (const f of files) {
        const title = f.name || f.path?.split('/').pop() || ''
        const score = fuzzyScore(`${title} ${f.path || ''}`, q)
        if (score > 0) {
          const fileObj = f
          out.push({
            kind: opened.includes(fileObj.id) ? 'recent' : 'file',
            id: fileObj.id,
            title,
            subtitle: f.path,
            exec: () => {
              addOpenedFile(fileObj.id)
              setActiveId(fileObj.id)
            },
            score: opened.includes(fileObj.id) ? score + 20 : score,
          })
        }
      }
    }
    if (wantCmds) {
      for (const [id, cmd] of Object.entries(commands)) {
        const score = fuzzyScore(id, q)
        if (score > 0) {
          out.push({
            kind: 'command',
            id,
            title: id.replace(/_/g, ' ').replace(/^app /, ''),
            subtitle: id,
            exec: () => cmd.exec(),
            score,
          })
        }
      }
    }
    const wantContent = mode === 'all' || mode === 'content'
    if (wantContent) {
      for (const cm of contentMatches) {
        const first = cm.matches[0]
        if (!first) continue
        const fileObj = Object.values(pathEntries).find((f) => f && f.path === cm.path)
        if (!fileObj) continue
        const targetId = fileObj.id
        out.push({
          kind: 'content',
          id: `content:${cm.id}`,
          title: cm.relative_path.split('/').pop() || cm.relative_path,
          subtitle: `L${first.line}: ${first.content.trim().slice(0, 60)}`,
          exec: () => {
            addOpenedFile(targetId)
            setActiveId(targetId)
          },
          score: 80 + cm.matches.length,
        })
      }
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 80)
  }, [open, mode, query, opened, commands, addOpenedFile, setActiveId, contentMatches])

  useEffect(() => {
    setActiveIdx(0)
  }, [query, mode])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, entries.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const ent = entries[activeIdx]
      if (ent) {
        ent.exec()
        close()
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      setMode((m) => (m === 'all' ? 'files' : m === 'files' ? 'content' : m === 'content' ? 'commands' : 'all'))
    }
  }

  if (!open) return null

  const placeholder =
    mode === 'files'
      ? 'Files...'
      : mode === 'content'
        ? 'Search content...'
        : mode === 'commands'
          ? 'Commands...'
          : 'Files, content, commands...'

  return (
    <Backdrop onClick={close}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <SearchInput>
          <i className='ri-search-2-line' />
          <input
            ref={inputRef}
            value={query}
            placeholder={placeholder}
            autoComplete='off'
            autoCorrect='off'
            autoCapitalize='off'
            spellCheck={false}
            data-gramm='false'
            data-1p-ignore
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </SearchInput>
        <ModeBar>
          <ModePill $active={mode === 'all'} onClick={() => setMode('all')}>
            <i className='ri-apps-2-line' /> All
          </ModePill>
          <ModePill $active={mode === 'files'} onClick={() => setMode('files')}>
            <i className='ri-file-list-2-line' /> Files
          </ModePill>
          <ModePill $active={mode === 'content'} onClick={() => setMode('content')}>
            <i className='ri-text' /> Content {contentLoading ? '...' : ''}
          </ModePill>
          <ModePill $active={mode === 'commands'} onClick={() => setMode('commands')}>
            <i className='ri-terminal-line' /> Commands
          </ModePill>
        </ModeBar>
        <div ref={listRef} style={{ maxHeight: 380, overflow: 'auto' }}>
          {entries.length === 0 ? (
            <Empty>
              {query.trim().length === 0
                ? 'Type to search'
                : query.trim().length < 2
                  ? 'Keep typing...'
                  : 'No matches'}
            </Empty>
          ) : (
            entries.map((ent, i) => (
              <Item
                key={`${ent.kind}:${ent.id}`}
                data-idx={i}
                $active={i === activeIdx}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => {
                  ent.exec()
                  close()
                }}
              >
                <i
                  className={
                    ent.kind === 'file'
                      ? 'ri-file-list-2-line'
                      : ent.kind === 'recent'
                        ? 'ri-time-line'
                        : ent.kind === 'content'
                          ? 'ri-search-line'
                          : 'ri-terminal-line'
                  }
                />
                <ItemTitle>{ent.title}</ItemTitle>
                {ent.subtitle && <ItemMeta>{ent.subtitle}</ItemMeta>}
              </Item>
            ))
          )}
        </div>
        <FooterHint>
          <span><kbd>up</kbd><kbd>down</kbd> navigate</span>
          <span><kbd>enter</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </FooterHint>
      </Panel>
    </Backdrop>
  )
})

CommandPalette.displayName = 'CommandPalette'

export default CommandPalette
