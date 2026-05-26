import useSearchStore from '@/extensions/search/useSearchStore'
import { useEditorStore } from '@/stores'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bar, Counter, HistoryDropdown, HistoryItem, Input, ResetBtn, Wrap } from './styles'

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const MIN_QUERY = 2
const HISTORY_KEY = 'mdmaster.qs.history'
const MAX_HISTORY = 10

const loadHistory = (): string[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const pushHistory = (q: string) => {
  if (!q || q.length < MIN_QUERY) return
  try {
    const cur = loadHistory().filter((x) => x !== q)
    const next = [q, ...cur].slice(0, MAX_HISTORY)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {}
}

const QuickSearchBar = memo(() => {
  const [query, setQuery] = useState('')
  const [matchCount, setMatchCount] = useState(0)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<string[]>(() => loadHistory())
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<number | null>(null)
  const { activeId, editorCtxMap } = useEditorStore()
  const setSearchState = useSearchStore((s) => s.setSearchState)
  const caseSensitive = useSearchStore((s) => s.caseSensitive)

  const countMatches = useCallback(() => {
    if (!query || !activeId) return 0
    const ctx = editorCtxMap.get(activeId)
    const view = ctx?.manager?.view as any
    if (!view) return 0
    const text = view.state.doc.textContent as string
    const re = new RegExp(escapeRegExp(query), caseSensitive ? 'g' : 'gi')
    const m = text.match(re)
    return m ? m.length : 0
  }, [query, activeId, editorCtxMap, caseSensitive])

  const runFind = useCallback(
    (idx: number) => {
      if (!activeId) return
      const ctx = editorCtxMap.get(activeId)
      if (!ctx) return
      if (!query) {
        ctx.commands?.stopFind?.()
        return
      }
      ctx.helpers.findRanges?.({
        query,
        caseSensitive,
        activeIndex: idx,
      })
    },
    [query, activeId, editorCtxMap, caseSensitive],
  )

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < MIN_QUERY) {
      setMatchCount(0)
      setCurrentIdx(0)
      if (activeId) editorCtxMap.get(activeId)?.commands?.stopFind?.()
      return
    }
    const delay = q.length <= 3 ? 140 : 70
    debounceRef.current = window.setTimeout(() => {
      const c = countMatches()
      setMatchCount(c)
      setCurrentIdx(0)
      runFind(0)
    }, delay)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [query, countMatches, runFind, activeId, editorCtxMap])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'f' && !e.shiftKey) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const next = useCallback(() => {
    if (matchCount === 0) return
    const i = (currentIdx + 1) % matchCount
    setCurrentIdx(i)
    runFind(i)
  }, [matchCount, currentIdx, runFind])

  const prev = useCallback(() => {
    if (matchCount === 0) return
    const i = (currentIdx - 1 + matchCount) % matchCount
    setCurrentIdx(i)
    runFind(i)
  }, [matchCount, currentIdx, runFind])

  const clear = useCallback(() => {
    setQuery('')
    setMatchCount(0)
    setCurrentIdx(0)
    if (activeId) editorCtxMap.get(activeId)?.commands?.stopFind?.()
    setSearchState({ searchKeyword: '', resultList: [] })
  }, [activeId, editorCtxMap, setSearchState])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      pushHistory(query.trim())
      setHistory(loadHistory())
      if (e.shiftKey) prev()
      else next()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      clear()
      setShowHistory(false)
      inputRef.current?.blur()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (showHistory && history.length > 0) {
        setQuery(history[0])
        setShowHistory(false)
      } else {
        next()
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      prev()
    } else if (e.key === 'Tab' && history.length > 0 && !query) {
      e.preventDefault()
      setShowHistory((v) => !v)
    }
  }

  const counter = useMemo(
    () => (matchCount === 0 ? '' : `${currentIdx + 1}/${matchCount}`),
    [matchCount, currentIdx],
  )

  const subtitle =
    query.trim().length === 0
      ? 'Quick find (Cmd+F, 2+ chars, Tab history)'
      : query.trim().length < MIN_QUERY
        ? `Type ${MIN_QUERY - query.trim().length} more`
        : matchCount === 0
          ? 'No match'
          : null

  return (
    <Wrap>
      <Bar>
        <i className='ri-search-2-line' />
        <Input
          ref={inputRef}
          value={query}
          placeholder={subtitle ?? 'Quick find'}
          autoComplete='off'
          autoCorrect='off'
          autoCapitalize='off'
          spellCheck={false}
          data-gramm='false'
          data-1p-ignore
          onChange={(e) => {
            setQuery(e.target.value)
            setShowHistory(false)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => !query && history.length > 0 && setShowHistory(true)}
        />
        <Counter $empty={matchCount === 0}>{counter || ''}</Counter>
        {query && (
          <ResetBtn onClick={clear} title='Clear (Esc)'>
            <i className='ri-close-line' />
          </ResetBtn>
        )}
      </Bar>
      {showHistory && history.length > 0 && !query && (
        <HistoryDropdown>
          {history.map((h) => (
            <HistoryItem
              key={h}
              onMouseDown={(e) => {
                e.preventDefault()
                setQuery(h)
                setShowHistory(false)
              }}
            >
              <i className='ri-history-line' />
              <span>{h}</span>
            </HistoryItem>
          ))}
        </HistoryDropdown>
      )}
    </Wrap>
  )
})

QuickSearchBar.displayName = 'QuickSearchBar'

export default QuickSearchBar
