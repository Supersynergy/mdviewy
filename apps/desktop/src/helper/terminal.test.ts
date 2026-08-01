import { invoke } from '@tauri-apps/api/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAC_TERMINALS, detectMacTerminal, resetTerminalDetection } from './terminal'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/plugin-shell', () => ({ Command: { create: vi.fn() } }))

const invokeMock = vi.mocked(invoke)

const installed = (...apps: string[]) => {
  invokeMock.mockImplementation(async (_cmd, args) => {
    const path = (args as { filePath: string }).filePath
    return apps.some((app) => path === `/Applications/${app}.app`)
  })
}

describe('detectMacTerminal', () => {
  beforeEach(() => {
    invokeMock.mockReset()
    resetTerminalDetection()
  })

  it('prefers cmux over every other installed terminal', async () => {
    installed('cmux', 'Ghostty', 'WezTerm')

    expect((await detectMacTerminal()).id).toBe('cmux')
  })

  it('falls to Ghostty when cmux is absent', async () => {
    installed('Ghostty', 'WezTerm', 'kitty')

    expect((await detectMacTerminal()).id).toBe('ghostty')
  })

  it('ends at Terminal.app when nothing else is installed', async () => {
    installed()

    expect((await detectMacTerminal()).id).toBe('terminal')
  })

  it('caches the result so opening a menu does not re-probe', async () => {
    installed('Ghostty')

    await detectMacTerminal()
    const callsAfterFirst = invokeMock.mock.calls.length
    await detectMacTerminal()

    expect(invokeMock.mock.calls.length).toBe(callsAfterFirst)
  })
})

describe('MAC_TERMINALS', () => {
  it('passes the working directory to every terminal', () => {
    for (const terminal of MAC_TERMINALS) {
      expect(terminal.openArgs('/tmp/notes').join(' ')).toContain('/tmp/notes')
    }
  })

  it('runs a command only where the terminal supports it', () => {
    for (const terminal of MAC_TERMINALS) {
      if (terminal.runsCommand) {
        expect(terminal.commandArgs).toBeTypeOf('function')
        expect(terminal.commandArgs!('/tmp/notes', 'claude').join(' ')).toContain('claude')
      } else {
        expect(terminal.commandArgs).toBeUndefined()
      }
    }
  })

  it('keeps Terminal.app last as the always-present fallback', () => {
    expect(MAC_TERMINALS[MAC_TERMINALS.length - 1].id).toBe('terminal')
  })
})
