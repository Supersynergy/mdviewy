import styled, { css } from 'styled-components'

interface EditorWrapperProps {
  active: boolean
  contentWidth: EditorContentWidth
}

export type EditorContentWidth = 'adaptive' | 'focused' | 'wide' | 'full'

export const normalizeEditorContentWidth = (
  value: unknown,
  legacyFullWidth = false,
): EditorContentWidth => {
  if (value === 'adaptive' || value === 'focused' || value === 'wide' || value === 'full') {
    return value
  }
  return legacyFullWidth ? 'full' : 'adaptive'
}

const maxWidthByMode: Record<EditorContentWidth, string> = {
  adaptive: 'min(100%, clamp(1120px, 90vw, 1600px))',
  focused: 'min(100%, 920px)',
  wide: 'min(100%, 1320px)',
  full: '100%',
}

export const EditorWrapper = styled.div.attrs<EditorWrapperProps>((props) => props)`
  flex: 1;
  width: 100%;
  min-width: 0;
  height: 100%;
  box-sizing: border-box;
  position: relative;
  display: grid;
  grid-template-columns: 1fr;

  > * {
    grid-column: 1;
    grid-row: 1;
  }

  /* Pretty mode renders semantic formatting. RME normally reveals Markdown
     delimiters when the caret enters a mark; keep those implementation markers
     hidden here. Literal and escaped stars are plain text and remain visible. */
  & .md-mark {
    display: none !important;
    font-size: 0 !important;
    letter-spacing: 0 !important;
  }

  ${(props) =>
    props.active
      ? css({
          maxWidth: maxWidthByMode[props.contentWidth],
          margin: '0 auto',
          paddingInline:
            props.contentWidth === 'full' ? '24px' : 'clamp(18px, 2.5vw, 48px)',
          paddingBottom: '3rem',
          marginInlineStart: 'auto',
          marginInlineEnd: 'auto',
        })
      : css({
          display: 'none',
        })}
`

export const EditorToc = styled.div`
  position: sticky;
  right: 0;
  top: 0;
  height: 100%;
  overflow: hidden;
  z-index: 5;
  justify-self: end;
  align-self: start;
  margin: 12px 12px 0 0;
  pointer-events: auto;
`
