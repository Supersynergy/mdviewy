import NiceModal from '@ebay/nice-modal-react'
import isPropValid from '@emotion/is-prop-valid'
import { useMemo } from 'react'
import { IStyleSheetContext, StyleSheetManager, ThemeProvider } from 'styled-components'
import { ThemeProvider as ZensThemeProvider } from 'zens'
import { GlobalStyles } from './globalStyles'
import { InjectFonts } from './injectFonts'
import useAppSettingStore from './stores/useAppSettingStore'
import useThemeStore from './stores/useThemeStore'

const AppThemeProvider: React.FC<BaseComponentProps> = function ({ children }) {
  const { curTheme } = useThemeStore()
  const { settingData } = useAppSettingStore()
  const theme = curTheme?.styledConstants || {}

  const themeProp = useMemo(
    () => ({
      mode: curTheme.mode,
      token: {
        ...curTheme.styledConstants,
        fontFamily: settingData.editor_root_font_family,
        codemirrorFontFamily: settingData.editor_code_font_family,
      },
    }),
    [
      curTheme.mode,
      curTheme.styledConstants,
      settingData.editor_root_font_family,
      settingData.editor_code_font_family,
    ],
  )

  return (
    <StyleSheetManager shouldForwardProp={shouldForwardProp}>
      <ThemeProvider theme={theme}>
        <ZensThemeProvider theme={themeProp}>
          <InjectFonts />
          <GlobalStyles />
          <NiceModal.Provider>{children}</NiceModal.Provider>
        </ZensThemeProvider>
      </ThemeProvider>
    </StyleSheetManager>
  )
}

// This implements the default behavior from styled-components v5
const shouldForwardProp: IStyleSheetContext['shouldForwardProp'] = function (propName, target) {
  if (typeof target === 'string') {
    // For HTML elements, forward the prop if it is a valid HTML attribute
    return isPropValid(propName)
  }
  // For other elements, forward all props
  return true
}

export default AppThemeProvider
