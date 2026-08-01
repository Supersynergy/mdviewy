import { logger } from '@/helper/logger'
import { invoke } from '@tauri-apps/api/core'
import { Command } from '@tauri-apps/plugin-shell'

export type TerminalId =
  | 'cmux'
  | 'ghostty'
  | 'wezterm'
  | 'kitty'
  | 'alacritty'
  | 'iterm'
  | 'warp'
  | 'terminal'

type MacTerminal = {
  id: TerminalId
  /** Bundle name under /Applications, without `.app`. */
  app: string
  /** Builds the `open` arguments that start the app in `dir`. */
  openArgs: (dir: string) => string[]
  /** True when the app can run a command directly, not just open a shell. */
  runsCommand: boolean
  commandArgs?: (dir: string, command: string) => string[]
}

/**
 * Preference order for macOS. A terminal the user installed on purpose beats
 * the system default, so `Open Terminal here` lands where they actually work.
 */
export const MAC_TERMINALS: MacTerminal[] = [
  {
    id: 'cmux',
    app: 'cmux',
    openArgs: (dir) => ['-a', 'cmux', dir],
    runsCommand: false,
  },
  {
    id: 'ghostty',
    app: 'Ghostty',
    openArgs: (dir) => ['-na', 'Ghostty', '--args', `--working-directory=${dir}`],
    runsCommand: true,
    commandArgs: (dir, command) => [
      '-na',
      'Ghostty',
      '--args',
      `--working-directory=${dir}`,
      '-e',
      command,
    ],
  },
  {
    id: 'wezterm',
    app: 'WezTerm',
    openArgs: (dir) => ['-na', 'WezTerm', '--args', 'start', '--cwd', dir],
    runsCommand: true,
    commandArgs: (dir, command) => [
      '-na',
      'WezTerm',
      '--args',
      'start',
      '--cwd',
      dir,
      '--',
      'sh',
      '-lc',
      command,
    ],
  },
  {
    id: 'kitty',
    app: 'kitty',
    openArgs: (dir) => ['-na', 'kitty', '--args', '--directory', dir],
    runsCommand: true,
    commandArgs: (dir, command) => [
      '-na',
      'kitty',
      '--args',
      '--directory',
      dir,
      'sh',
      '-lc',
      command,
    ],
  },
  {
    id: 'alacritty',
    app: 'Alacritty',
    openArgs: (dir) => ['-na', 'Alacritty', '--args', '--working-directory', dir],
    runsCommand: true,
    commandArgs: (dir, command) => [
      '-na',
      'Alacritty',
      '--args',
      '--working-directory',
      dir,
      '-e',
      'sh',
      '-lc',
      command,
    ],
  },
  { id: 'iterm', app: 'iTerm', openArgs: (dir) => ['-a', 'iTerm', dir], runsCommand: false },
  { id: 'warp', app: 'Warp', openArgs: (dir) => ['-a', 'Warp', dir], runsCommand: false },
  { id: 'terminal', app: 'Terminal', openArgs: (dir) => ['-a', 'Terminal', dir], runsCommand: false },
]

export const isMac = () => navigator.platform.toLowerCase().includes('mac')
export const isWindows = () => navigator.platform.toLowerCase().includes('win')

let cachedTerminal: MacTerminal | null | undefined

const appExists = async (app: string) => {
  try {
    // Native check instead of a shell probe: the shell scope only allows
    // `open`, and spawning a process per candidate on every menu open is waste.
    return await invoke<boolean>('file_exists', { filePath: `/Applications/${app}.app` })
  } catch (error) {
    logger.debug('terminal detection failed', error)
    return false
  }
}

/** First installed terminal in preference order; `terminal` as the fallback. */
export const detectMacTerminal = async (): Promise<MacTerminal> => {
  if (cachedTerminal !== undefined && cachedTerminal !== null) return cachedTerminal

  for (const terminal of MAC_TERMINALS) {
    if (terminal.id === 'terminal' || (await appExists(terminal.app))) {
      cachedTerminal = terminal
      return terminal
    }
  }

  cachedTerminal = MAC_TERMINALS[MAC_TERMINALS.length - 1]
  return cachedTerminal
}

/** Clears the cache, e.g. after the user installs a terminal. */
export const resetTerminalDetection = () => {
  cachedTerminal = undefined
}

const runOpen = async (args: string[]) => {
  const result = await Command.create('open', args).execute()
  if (result.code !== 0) throw new Error(result.stderr || `open exited ${result.code}`)
}

export type TerminalLaunch = {
  /** Terminal that handled the request. */
  id: TerminalId
  /** True when `command` was executed; false when only the folder was opened. */
  ranCommand: boolean
}

/**
 * Opens `dir` in the preferred terminal, running `command` when that terminal
 * supports it. Callers fall back to the clipboard when `ranCommand` is false.
 */
export const openTerminalAt = async (dir: string, command?: string): Promise<TerminalLaunch> => {
  if (isWindows()) {
    await Command.create('cmd', ['/c', 'start', '', 'cmd', '/k', `cd /d "${dir}"`]).execute()
    return { id: 'terminal', ranCommand: false }
  }

  if (!isMac()) {
    await Command.create('xdg-open', [dir]).execute()
    return { id: 'terminal', ranCommand: false }
  }

  const terminal = await detectMacTerminal()

  if (command && terminal.runsCommand && terminal.commandArgs) {
    await runOpen(terminal.commandArgs(dir, command))
    return { id: terminal.id, ranCommand: true }
  }

  await runOpen(terminal.openArgs(dir))
  return { id: terminal.id, ranCommand: false }
}
