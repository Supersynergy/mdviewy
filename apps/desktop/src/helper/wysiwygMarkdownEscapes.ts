const ESCAPED_ASTERISK_SENTINEL = '\uFEFF'

/**
 * RME applies a second inline-Markdown pass after the block parser has already
 * consumed character escapes. Protect a deliberately escaped asterisk with an
 * invisible delimiter that prevents that second pass from treating it as
 * emphasis. The original Markdown is restored before content leaves mdviewy.
 */
export function protectWysiwygEscapedAsterisks(markdown: string): string {
  return markdown.replace(/(^|[^\\])\\\*/g, `$1*${ESCAPED_ASTERISK_SENTINEL}`)
}

export function restoreWysiwygEscapedAsterisks(markdown: string): string {
  return markdown.replaceAll(`*${ESCAPED_ASTERISK_SENTINEL}`, '\\*')
}
