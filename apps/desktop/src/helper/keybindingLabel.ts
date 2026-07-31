import type { KeyboardInfo } from '@/hooks/useKeyboard'

const MAC_PATTERN = /Mac|iPhone|iPad/

const isMac = () => typeof navigator !== 'undefined' && MAC_PATTERN.test(navigator.userAgent)

/**
 * Turns a stored key map (`['CommandOrCtrl', 'Shift', 'o']`) into the label the
 * UI shows next to a command: `Cmd+Shift+O` on macOS, `Ctrl+Shift+O` elsewhere.
 */
export const formatKeyMap = (keyMap: string[]): string =>
  keyMap
    .map((key) => {
      if (key === 'CommandOrCtrl') return isMac() ? 'Cmd' : 'Ctrl'
      return key.length === 1 ? key.toUpperCase() : key
    })
    .join('+')

/** Shortcut label for a command id, or undefined when it has no binding. */
export const shortcutFor = (
  keyboardInfos: KeyboardInfo[],
  commandId: string,
): string | undefined => {
  const info = keyboardInfos.find((entry) => entry.id === commandId)
  if (!info || info.key_map.length === 0) return undefined
  return formatKeyMap(info.key_map)
}
