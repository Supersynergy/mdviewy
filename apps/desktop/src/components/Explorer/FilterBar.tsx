import { memo, useEffect, useState, useTransition } from 'react'
import styled from 'styled-components'
import {
  DEFAULT_EXPLORER_FILTER,
  normalizeFilterQuery,
  type ExplorerFilter,
} from './filter'

const STORAGE_KEY = 'mdmaster.explorer.filter'
const LEGACY_DEFAULT_FILTER: ExplorerFilter = {
  ...DEFAULT_EXPLORER_FILTER,
  scope: 'md',
}

const isSameFilter = (a: ExplorerFilter, b: ExplorerFilter) =>
  a.scope === b.scope &&
  a.customExt === b.customExt &&
  a.query === b.query &&
    a.hideHidden === b.hideHidden &&
    a.flat === b.flat

const normalizeScope = (scope: unknown): ExplorerFilter['scope'] => {
  return scope === 'md' || scope === 'custom' || scope === 'all' ? scope : DEFAULT_EXPLORER_FILTER.scope
}

const normalizeFilter = (value: unknown, opts: { resetQuery?: boolean } = {}): ExplorerFilter => {
  const raw = value && typeof value === 'object' ? (value as Partial<ExplorerFilter>) : {}
  const rawQuery = normalizeFilterQuery(raw.query)
  const filter: ExplorerFilter = {
    scope: normalizeScope(raw.scope),
    customExt:
      typeof raw.customExt === 'string'
        ? raw.customExt.slice(0, 200)
        : DEFAULT_EXPLORER_FILTER.customExt,
    query: opts.resetQuery ? '' : rawQuery,
    hideHidden:
      typeof raw.hideHidden === 'boolean' ? raw.hideHidden : DEFAULT_EXPLORER_FILTER.hideHidden,
    flat: typeof raw.flat === 'boolean' ? raw.flat : DEFAULT_EXPLORER_FILTER.flat,
  }

  return !rawQuery && isSameFilter(filter, LEGACY_DEFAULT_FILTER)
    ? DEFAULT_EXPLORER_FILTER
    : filter
}

const toPersistedFilter = (filter: ExplorerFilter): ExplorerFilter => ({
  ...normalizeFilter(filter),
  query: '',
})

export const loadFilter = (): ExplorerFilter => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_EXPLORER_FILTER

    const parsed = JSON.parse(raw)
    const filter = normalizeFilter({ ...DEFAULT_EXPLORER_FILTER, ...parsed }, { resetQuery: true })
    const persisted = toPersistedFilter(filter)
    if (JSON.stringify(parsed) !== JSON.stringify(persisted)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
    }
    return filter
  } catch {
    return DEFAULT_EXPLORER_FILTER
  }
}

const saveFilter = (f: ExplorerFilter) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersistedFilter(f)))
  } catch {}
}

const Bar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 8px 8px;
  border-bottom: 1px solid ${(p) => p.theme.borderColor};
  background: ${(p) => p.theme.bgColor};
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const Pill = styled.button<{ $active?: boolean }>`
  border: 0;
  background: ${(p) => (p.$active ? p.theme.accentColorFocused : 'transparent')};
  color: ${(p) => (p.$active ? p.theme.accentColor : p.theme.labelFontColor)};
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  transition: background 120ms ease;

  &:hover {
    background: ${(p) => (p.$active ? p.theme.accentColorFocused : p.theme.hoverColor)};
    color: ${(p) => p.theme.primaryFontColor};
  }
`

const Search = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 8px;
  background: ${(p) => p.theme.hoverColor};
  border: 1px solid transparent;
  transition: border-color 140ms ease;

  &:focus-within {
    border-color: ${(p) => p.theme.accentColor};
  }

  i {
    font-size: 0.85rem;
    color: ${(p) => p.theme.labelFontColor};
  }

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    outline: none;
    font-size: 0.78rem;
    color: ${(p) => p.theme.primaryFontColor};
    font-family: inherit;

    &::placeholder {
      color: ${(p) => p.theme.labelFontColor};
      opacity: 0.7;
    }
  }
`

const Toggle = styled.button<{ $on?: boolean }>`
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 0.85rem;
  color: ${(p) => (p.$on ? p.theme.accentColor : p.theme.labelFontColor)};
  padding: 2px 4px;
  border-radius: 4px;

  &:hover {
    background: ${(p) => p.theme.hoverColor};
  }
`

const ExtInput = styled.input`
  flex: 1;
  min-width: 0;
  border: 1px solid ${(p) => p.theme.borderColor};
  border-radius: 6px;
  background: ${(p) => p.theme.hoverColor};
  outline: none;
  padding: 3px 8px;
  font-size: 0.72rem;
  font-family: 'SF Mono', monospace;
  color: ${(p) => p.theme.primaryFontColor};

  &:focus { border-color: ${(p) => p.theme.accentColor}; }
`

type Props = { value: ExplorerFilter; onChange: (f: ExplorerFilter) => void }

const FilterBar = memo(({ value, onChange }: Props) => {
  const [local, setLocal] = useState(value)
  const [, startTransition] = useTransition()

  useEffect(() => {
    setLocal(value)
  }, [value])

  const apply = (patch: Partial<ExplorerFilter>) => {
    const next = { ...local, ...patch }
    setLocal(next)
    if (Object.keys(patch).some((key) => key !== 'query')) {
      saveFilter(next)
    }
    startTransition(() => onChange(next))
  }

  return (
    <Bar>
      <Search>
        <i className='ri-search-2-line' />
        <input
          placeholder='Filter files…'
          value={local.query}
          autoComplete='off'
          autoCorrect='off'
          autoCapitalize='off'
          spellCheck={false}
          data-gramm='false'
          data-1p-ignore
          onChange={(e) => apply({ query: e.target.value })}
        />
        <Toggle
          $on={local.flat}
          title={local.flat ? 'Flat list (folders hidden)' : 'Tree view'}
          onClick={() => apply({ flat: !local.flat })}
        >
          <i className={local.flat ? 'ri-list-check' : 'ri-folder-line'} />
        </Toggle>
        <Toggle
          $on={local.hideHidden}
          title={local.hideHidden ? 'Hidden files: off' : 'Hidden files: on'}
          onClick={() => apply({ hideHidden: !local.hideHidden })}
        >
          <i className={local.hideHidden ? 'ri-eye-off-line' : 'ri-eye-line'} />
        </Toggle>
      </Search>
      <Row>
        <Pill $active={local.scope === 'md'} onClick={() => apply({ scope: 'md' })}>
          MD
        </Pill>
        <Pill $active={local.scope === 'all'} onClick={() => apply({ scope: 'all' })}>
          All
        </Pill>
        <Pill $active={local.scope === 'custom'} onClick={() => apply({ scope: 'custom' })}>
          Ext
        </Pill>
        {local.scope === 'custom' && (
          <ExtInput
            value={local.customExt}
            placeholder='.md,.txt,.json'
            autoComplete='off'
            autoCorrect='off'
            spellCheck={false}
            onChange={(e) => apply({ customExt: e.target.value })}
          />
        )}
      </Row>
    </Bar>
  )
})

FilterBar.displayName = 'ExplorerFilterBar'

export default FilterBar
