import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const readSource = (relativePath: string) => {
  const currentDir = dirname(fileURLToPath(import.meta.url))
  return readFileSync(join(currentDir, relativePath), 'utf8')
}

describe('Smart actions ordering', () => {
  it('offers Reveal in Finder before the clipboard entries', () => {
    const source = readSource('SmartActionsButton.tsx')

    expect(source.indexOf("'Reveal in Finder'")).toBeGreaterThan(-1)
    expect(source.indexOf("'Reveal in Finder'")).toBeLessThan(source.indexOf("'Copy absolute path'"))
  })

  it('opens the preferred terminal instead of hard-coding Terminal.app', () => {
    const source = readSource('SmartActionsButton.tsx')

    expect(source).toContain('openTerminalAt')
    expect(source).not.toContain("'-a', 'Terminal'")
  })

  it('starts the agent in the terminal and only falls back to the clipboard', () => {
    const source = readSource('SmartActionsButton.tsx')

    expect(source).toContain('launch.ranCommand')
    expect(source).toContain('command on clipboard')
  })
})

describe('Smart actions panel', () => {
  it('lists Reveal & Open above the clipboard group', () => {
    const source = readSource('../../../../../extensions/smart-actions/index.tsx')

    expect(source.indexOf("title: 'Reveal & Open'")).toBeLessThan(
      source.indexOf("title: 'Clipboard'"),
    )
  })

  it('routes agent handoff through the preferred terminal', () => {
    const source = readSource('../../../../../extensions/smart-actions/index.tsx')

    expect(source).toContain('runAgentInTerminal')
    expect(source).not.toContain("'-a', 'Terminal'")
  })
})
