import type { MfTheme } from '@mdmaster/theme'
import communicate from './communicate'

export function registerTheme(theme: MfTheme) {
  communicate.sendMessage({
    key: 'registerTheme',
    payload: theme
  })
}
