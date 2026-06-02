import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const customTocSource = readFileSync(join(__dirname, 'CustomToc.tsx'), 'utf8')
const tocViewSource = readFileSync(join(__dirname, 'TocView.tsx'), 'utf8')

describe('TOC click state', () => {
  it('marks clicked headings active immediately and rechecks after scroll', () => {
    expect(customTocSource).toContain('onSelectHeading?.(h.id)')
    expect(customTocSource).toContain('window.setTimeout(() => onSelectHeading?.(h.id), 80)')
    expect(tocViewSource).toContain('activeHeadingIdRef.current = id')
    expect(tocViewSource).toContain('setActiveHeadingId(id)')
    expect(tocViewSource).toContain('scheduleActiveHeadingUpdateRef.current()')
  })
})
