import type { MfTheme } from '@mdviewy/theme'

export type MDVIEWY_CONTEXT = {
  theme: {
    registerTheme: (theme: MfTheme) => void
  }
}

export type Extension = {
  name: string
  version: string
  description: string
}
