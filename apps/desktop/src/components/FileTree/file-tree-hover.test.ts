import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(__dirname, 'styles.ts'), 'utf8')

describe('file tree selected row hover', () => {
  it('keeps the selected markdown row visually stable on hover', () => {
    expect(source).toContain('props.selected ? props.theme.fileTreeSelectedBgColor : props.theme.hoverColor')
    expect(source).toContain("props.selected ? 'none' : 'translateX(1px)'")
  })
})
