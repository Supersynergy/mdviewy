import styled from 'styled-components'

export const Wrap = styled.div`
  position: relative;
`

export const Bar = styled.div`
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  margin: 6px 8px 8px;
  border-radius: 10px;
  background: ${(p) => p.theme.hoverColor};
  border: 1px solid ${(p) => p.theme.borderColor};
  backdrop-filter: saturate(160%) blur(8px);
  transition: border-color 140ms ease, box-shadow 140ms ease;

  &:focus-within {
    border-color: ${(p) => p.theme.accentColor};
    box-shadow: 0 0 0 3px ${(p) => p.theme.accentColorFocused};
  }

  i.ri-search-2-line {
    font-size: 0.95rem;
    color: ${(p) => p.theme.labelFontColor};
  }
`

export const Input = styled.input`
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  outline: none;
  font-size: 0.82rem;
  color: ${(p) => p.theme.primaryFontColor};
  font-family: inherit;

  &::placeholder {
    color: ${(p) => p.theme.labelFontColor};
    opacity: 0.65;
  }
`

export const Counter = styled.span<{ $empty?: boolean }>`
  font-size: 0.7rem;
  color: ${(p) => p.theme.labelFontColor};
  font-variant-numeric: tabular-nums;
  font-family: 'SF Mono', monospace;
  min-width: 32px;
  text-align: right;
  opacity: ${(p) => (p.$empty ? 0 : 1)};
  transition: opacity 140ms ease;
`

export const ResetBtn = styled.button`
  border: 0;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  color: ${(p) => p.theme.labelFontColor};
  padding: 0;
  transition: background 120ms ease, color 120ms ease;

  &:hover {
    background: ${(p) => p.theme.borderColor};
    color: ${(p) => p.theme.primaryFontColor};
  }

  i {
    font-size: 0.85rem;
  }
`

export const HistoryDropdown = styled.div`
  position: absolute;
  top: calc(100% - 4px);
  left: 8px;
  right: 8px;
  z-index: 50;
  background: ${(p) => p.theme.bgColor};
  border: 1px solid ${(p) => p.theme.borderColor};
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22), 0 2px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  animation: hist-pop 120ms ease;

  @keyframes hist-pop {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
`

export const HistoryItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 0.78rem;
  color: ${(p) => p.theme.primaryFontColor};
  transition: background 100ms ease;

  i {
    font-size: 0.85rem;
    color: ${(p) => p.theme.labelFontColor};
  }

  &:hover {
    background: ${(p) => p.theme.hoverColor};
    i {
      color: ${(p) => p.theme.accentColor};
    }
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`
