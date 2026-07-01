import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const linkIcon = 'ri-' + 'link'

describe('SourceCodeToolbar markdown controls', () => {
  it('uses page break instead of link insertion', () => {
    const toolbarSource = readFileSync(join(currentDir, 'SourceCodeToolbar.tsx'), 'utf8')
    const commandSource = readFileSync(join(currentDir, 'CodeCommandButton.tsx'), 'utf8')
    const markdownCommandSource = readFileSync(join(currentDir, 'markdownCommands.ts'), 'utf8')

    expect(toolbarSource).toContain("commandName='insertPageBreak'")
    expect(toolbarSource).toContain("icon='ri-separator'")
    expect(toolbarSource).not.toContain("commandName='insertLink'")
    expect(toolbarSource).not.toContain(`icon='${linkIcon}'`)

    expect(commandSource).toContain('insertPageBreak: mdCommands.insertPageBreak')
    expect(commandSource).not.toContain('insertLink: mdCommands.insertLink')

    expect(markdownCommandSource).toContain('PAGE_BREAK_MARKDOWN')
    expect(markdownCommandSource).toContain('mdviewy-page-break')
    expect(markdownCommandSource).not.toContain('export function insertLink')
  })
})
