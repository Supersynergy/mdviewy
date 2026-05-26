import { lightTheme } from '@mdmaster/theme';
import type { CSSProp } from 'styled-components';

type ThemeType = typeof lightTheme.styledConstants;

declare module 'styled-components' {
  export interface DefaultTheme extends ThemeType {}
}

declare module 'react' {
  interface DOMAttributes<T> {
    css?: CSSProp;
  }
}
