export interface MarkdownInsights {
  characterCount: number
  wordCount: number
  readingTimeMinutes: number
  headingCount: number
  taskCount: number
  completedTaskCount: number
  linkCount: number
  imageCount: number
  codeBlockCount: number
  tableCount: number
  frontmatter: boolean
}

const EMPTY_INSIGHTS: MarkdownInsights = {
  characterCount: 0,
  wordCount: 0,
  readingTimeMinutes: 0,
  headingCount: 0,
  taskCount: 0,
  completedTaskCount: 0,
  linkCount: 0,
  imageCount: 0,
  codeBlockCount: 0,
  tableCount: 0,
  frontmatter: false,
}

const WORDS_PER_MINUTE = 225

export function analyzeMarkdownContent(markdown: string): MarkdownInsights {
  if (!markdown) {
    return { ...EMPTY_INSIGHTS }
  }

  const withoutFrontmatter = stripFrontmatter(markdown)
  const content = withoutFrontmatter.content
  const lines = content.split(/\r?\n/)
  const codeBlockCount = countMatches(content, /(^|\n)\s*(```|~~~)/g) / 2

  const headingCount = lines.filter((line) => /^#{1,6}\s+\S/.test(line.trim())).length
  const taskLines = lines.filter((line) => /^\s*[-*+]\s+\[[ xX]\]\s+/.test(line))
  const completedTaskCount = taskLines.filter((line) => /^\s*[-*+]\s+\[[xX]\]\s+/.test(line)).length
  const tableCount = countMarkdownTables(lines)
  const imageCount = countMatches(content, /!\[[^\]]*]\([^)]+\)/g)
  const linkCount = countMatches(content, /(?<!!)\[[^\]]+]\([^)]+\)/g)
  const wordCount = countReadableWords(content)

  return {
    characterCount: markdown.length,
    wordCount,
    readingTimeMinutes: wordCount === 0 ? 0 : Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE)),
    headingCount,
    taskCount: taskLines.length,
    completedTaskCount,
    linkCount,
    imageCount,
    codeBlockCount,
    tableCount,
    frontmatter: withoutFrontmatter.frontmatter,
  }
}

function stripFrontmatter(markdown: string): { content: string; frontmatter: boolean } {
  if (!markdown.startsWith('---')) {
    return { content: markdown, frontmatter: false }
  }

  const end = markdown.indexOf('\n---', 3)
  if (end === -1) {
    return { content: markdown, frontmatter: false }
  }

  const after = markdown.indexOf('\n', end + 4)
  return {
    content: after === -1 ? '' : markdown.slice(after + 1),
    frontmatter: true,
  }
}

function countReadableWords(markdown: string): number {
  const readable = markdown
    .replace(/(^|\n)\s*(```|~~~)[\s\S]*?(\n\s*\2)(?=\n|$)/g, '\n')
    .replace(/^\s*\|.*\|\s*$/gm, '\n')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/`[^`]*`/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, '')
    .replace(/[*_~>#()[\]{}|\\]/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')

  return readable.match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu)?.length ?? 0
}

function countMarkdownTables(lines: string[]): number {
  let count = 0

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index].trim()
    const previousLine = lines[index - 1].trim()
    if (!line.includes('|') || !previousLine.includes('|')) continue
    if (/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line)) {
      count += 1
    }
  }

  return count
}

function countMatches(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0
}
