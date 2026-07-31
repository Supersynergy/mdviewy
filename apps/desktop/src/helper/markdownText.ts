/**
 * Normalizes Markdown as it comes off disk, before it reaches the editor.
 *
 * Files written by other tools carry invisible characters that the WYSIWYG
 * parser treats as text: a UTF-8 BOM keeps the first `#` from becoming a
 * heading, CR from CRLF files survives inside fenced code blocks, and
 * U+2028/U+2029 break lines in places the Markdown source does not.
 */
const BOM = '\uFEFF'
const CRLF = /\r\n?/g
const UNICODE_LINE_SEPARATORS = /[\u2028\u2029]/g

export const normalizeMarkdownSource = (content: string): string => {
  const withoutBom = content.startsWith(BOM) ? content.slice(BOM.length) : content

  return withoutBom.replace(CRLF, '\n').replace(UNICODE_LINE_SEPARATORS, '\n')
}
