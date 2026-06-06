import styled, { css } from 'styled-components'

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(6px) saturate(140%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  animation: cp-fade 140ms ease;

  @keyframes cp-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`

export const Panel = styled.div`
  width: min(640px, 92vw);
  background: ${(p) => p.theme.bgColor};
  border: 1px solid ${(p) => p.theme.borderColor};
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35), 0 6px 16px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  animation: cp-pop 160ms cubic-bezier(0.2, 0.9, 0.3, 1.2);

  @keyframes cp-pop {
    from { transform: translateY(-8px) scale(0.98); opacity: 0; }
    to { transform: translateY(0) scale(1); opacity: 1; }
  }
`

export const SearchInput = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid ${(p) => p.theme.borderColor};

  i {
    font-size: 1.1rem;
    color: ${(p) => p.theme.labelFontColor};
  }

  input {
    flex: 1;
    border: 0;
    background: transparent;
    outline: none;
    font-size: 1rem;
    color: ${(p) => p.theme.primaryFontColor};
    font-family: inherit;

    &::placeholder {
      color: ${(p) => p.theme.labelFontColor};
      opacity: 0.7;
    }
  }
`

export const CloseButton = styled.button`
  border: 0;
  background: transparent;
  color: ${(p) => p.theme.labelFontColor};
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;

  &:hover {
    color: ${(p) => p.theme.primaryFontColor};
    background: ${(p) => p.theme.hoverColor};
  }
`

export const ModeBar = styled.div`
  display: flex;
  gap: 4px;
  padding: 8px 14px 10px;
  border-bottom: 1px solid ${(p) => p.theme.borderColor};
  background: ${(p) => p.theme.hoverColor};
`

export const ModePill = styled.button<{ $active?: boolean }>`
  flex: 1;
  padding: 6px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  border: 0;
  cursor: pointer;
  border-radius: 8px;
  color: ${(p) => (p.$active ? p.theme.primaryFontColor : p.theme.labelFontColor)};
  background: ${(p) => (p.$active ? p.theme.bgColor : 'transparent')};
  box-shadow: ${(p) =>
    p.$active ? `0 1px 0 ${p.theme.borderColor}, 0 2px 6px rgba(0,0,0,0.08)` : 'none'};
  transition: background 120ms ease, color 120ms ease;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  i {
    font-size: 0.85rem;
    opacity: ${(p) => (p.$active ? 1 : 0.7)};
  }

  &:hover {
    color: ${(p) => p.theme.primaryFontColor};
  }
`

export const FooterHint = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 14px;
  border-top: 1px solid ${(p) => p.theme.borderColor};
  background: ${(p) => p.theme.hoverColor};
  font-size: 0.7rem;
  color: ${(p) => p.theme.labelFontColor};

  kbd {
    font-family: 'SF Mono', monospace;
    background: ${(p) => p.theme.bgColor};
    border: 1px solid ${(p) => p.theme.borderColor};
    border-radius: 3px;
    padding: 1px 4px;
    font-size: 0.65rem;
  }

  span {
    display: inline-flex;
    gap: 4px;
    align-items: center;
  }
`

export const Item = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  width: 100%;
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  color: ${(p) => p.theme.primaryFontColor};
  font-family: inherit;
  text-align: left;
  transition: background-color 100ms ease;

  i {
    font-size: 1rem;
    opacity: 0.8;
    flex-shrink: 0;
    width: 18px;
    text-align: center;
  }

  ${(p) =>
    p.$active &&
    css`
      background: ${p.theme.accentColorFocused};
      color: ${p.theme.primaryFontColor};
      i {
        opacity: 1;
        color: ${p.theme.accentColor};
      }
    `}
`

export const ItemTitle = styled.span`
  flex-shrink: 0;
  font-weight: 500;
`

export const ItemMeta = styled.span`
  flex: 1;
  text-align: right;
  font-size: 0.75rem;
  color: ${(p) => p.theme.labelFontColor};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  direction: rtl;
  font-family: 'SF Mono', monospace;
`

export const Empty = styled.div`
  padding: 32px;
  text-align: center;
  color: ${(p) => p.theme.labelFontColor};
  font-size: 0.9rem;
`
