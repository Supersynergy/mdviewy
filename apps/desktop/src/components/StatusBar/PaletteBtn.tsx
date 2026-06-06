import { memo } from 'react'
import styled from 'styled-components'
import { Tooltip } from 'zens'

const Btn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 6px 10px;
  font-size: 0.78rem;
  color: ${(p) => p.theme.labelFontColor};
  font-family: inherit;
  border-radius: 6px;
  transition: background 120ms ease, color 120ms ease;

  &:hover {
    background: ${(p) => p.theme.hoverColor};
    color: ${(p) => p.theme.primaryFontColor};
  }

  i {
    font-size: 0.85rem;
  }

  kbd {
    margin-left: 4px;
    font-family: 'SF Mono', monospace;
    font-size: 0.65rem;
    color: ${(p) => p.theme.labelFontColor};
    opacity: 0.7;
  }
`

export const PaletteBtn = memo(() => {
  return (
    <Tooltip title='Command Palette'>
      <Btn
        type='button'
        aria-label='Open command palette'
        onClick={() =>
          window.dispatchEvent(new CustomEvent('mf:cmd_palette:open', { detail: 'all' }))
        }
      >
        <i aria-hidden='true' className='ri-command-line' />
        Search
        <kbd>Cmd+K</kbd>
      </Btn>
    </Tooltip>
  )
})

PaletteBtn.displayName = 'PaletteBtn'
