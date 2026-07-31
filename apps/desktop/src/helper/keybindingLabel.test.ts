import { describe, expect, it } from 'vitest'
import { formatKeyMap, shortcutFor } from './keybindingLabel'

const withPlatform = (userAgent: string, run: () => void) => {
  const original = globalThis.navigator
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent },
    configurable: true,
  })
  try {
    run()
  } finally {
    Object.defineProperty(globalThis, 'navigator', { value: original, configurable: true })
  }
}

describe('formatKeyMap', () => {
  it('renders the macOS modifier and uppercases single keys', () => {
    withPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', () => {
      expect(formatKeyMap(['CommandOrCtrl', 'Shift', 'o'])).toBe('Cmd+Shift+O')
      expect(formatKeyMap(['CommandOrCtrl', 'l'])).toBe('Cmd+L')
    })
  })

  it('renders Ctrl off macOS', () => {
    withPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', () => {
      expect(formatKeyMap(['CommandOrCtrl', 'f'])).toBe('Ctrl+F')
    })
  })

  it('keeps punctuation keys as written', () => {
    withPlatform('Mozilla/5.0 (Macintosh)', () => {
      expect(formatKeyMap(['CommandOrCtrl', ','])).toBe('Cmd+,')
    })
  })
})

describe('shortcutFor', () => {
  const infos = [
    { id: 'app_toggleLeftsidebarVisible', key_map: ['CommandOrCtrl', 'l'], when: 'always' },
    { id: 'app_reset_layout', key_map: [], when: 'always' },
  ]

  it('finds the binding of a command', () => {
    withPlatform('Mozilla/5.0 (Macintosh)', () => {
      expect(shortcutFor(infos, 'app_toggleLeftsidebarVisible')).toBe('Cmd+L')
    })
  })

  it('returns undefined for commands without a binding', () => {
    expect(shortcutFor(infos, 'app_reset_layout')).toBeUndefined()
    expect(shortcutFor(infos, 'app_unknown')).toBeUndefined()
  })
})
