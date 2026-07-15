import { describe, expect, it } from 'vitest'
import {
  protectWysiwygEscapedAsterisks,
  restoreWysiwygEscapedAsterisks,
} from './wysiwygMarkdownEscapes'

describe('Pretty-mode escaped asterisks', () => {
  it('protects intentional literal stars and restores the exact Markdown', () => {
    const markdown = String.raw`\*intentional stars\*`
    const protectedMarkdown = protectWysiwygEscapedAsterisks(markdown)

    expect(protectedMarkdown).toBe(`*\uFEFFintentional stars*\uFEFF`)
    expect(restoreWysiwygEscapedAsterisks(protectedMarkdown)).toBe(markdown)
  })

  it('leaves real emphasis, arithmetic and code globs unchanged', () => {
    const markdown = '**bold**\n\n2 * 3 = 6 and `*.md` stays literal.'

    expect(protectWysiwygEscapedAsterisks(markdown)).toBe(markdown)
  })

  it('does not reinterpret an asterisk after an escaped backslash', () => {
    const markdown = String.raw`\\*not an escaped asterisk`

    expect(protectWysiwygEscapedAsterisks(markdown)).toBe(markdown)
  })
})
