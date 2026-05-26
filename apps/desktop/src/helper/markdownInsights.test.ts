import { describe, expect, it } from 'vitest'
import { analyzeMarkdownContent } from './markdownInsights'

describe('analyzeMarkdownContent', () => {
  it('extracts document signals that make markdown easier to scan', () => {
    const result = analyzeMarkdownContent(`# Plan

## Work

- [x] Rename the app
- [ ] Choose the mascot

Read the [release notes](https://example.com).

![Mascot](./logo.png)

| Feature | Status |
| --- | --- |
| TOC | done |

\`\`\`ts
const hiddenWords = 'not prose'
\`\`\`
`)

    expect(result.headingCount).toBe(2)
    expect(result.taskCount).toBe(2)
    expect(result.completedTaskCount).toBe(1)
    expect(result.linkCount).toBe(1)
    expect(result.imageCount).toBe(1)
    expect(result.codeBlockCount).toBe(1)
    expect(result.tableCount).toBe(1)
    expect(result.wordCount).toBe(12)
    expect(result.readingTimeMinutes).toBe(1)
  })

  it('keeps frontmatter and markdown syntax out of readable word counts', () => {
    const result = analyzeMarkdownContent(`---
title: Internal Draft
tags:
  - private
---

# Real Title

**Bold text** and _clear copy_ with \`inlineCode\`.
`)

    expect(result.wordCount).toBe(8)
    expect(result.headingCount).toBe(1)
    expect(result.frontmatter).toBe(true)
  })

  it('returns empty metrics for empty content', () => {
    expect(analyzeMarkdownContent('')).toEqual({
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
    })
  })
})
