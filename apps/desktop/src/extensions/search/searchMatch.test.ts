import { describe, expect, it } from 'vitest'
import { countLiteralMatches, findLiteralMatchPositions } from './searchMatch'

describe('search literal matching', () => {
  it('treats regex metacharacters as plain text', () => {
    expect(findLiteralMatchPositions('a+b aab a+b', 'a+b', true)).toEqual([
      { start: 0, end: 3 },
      { start: 8, end: 11 },
    ])
  })

  it('supports case-insensitive matching without RegExp', () => {
    expect(countLiteralMatches('Todo TODO done', 'todo', false)).toBe(2)
  })
})
