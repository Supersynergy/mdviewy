import { useOpen } from '@/hooks'
import { addNewMarkdownFileEdit } from '@/services/editor-file'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

export const EmptyState = memo(() => {
  const { t } = useTranslation()
  const { openFolderDialog, openFile } = useOpen()

  return (
    <Container className='w-full h-full'>
      <div className='hero'>
        <svg className='logo-mark' viewBox='0 0 1024 1024' role='img' aria-label='mdviewy'>
          <defs>
            <linearGradient id='tile-empty' x1='120' y1='70' x2='900' y2='960' gradientUnits='userSpaceOnUse'>
              <stop offset='0' stopColor='#0D2C35' />
              <stop offset='.5' stopColor='#166870' />
              <stop offset='1' stopColor='#72D6C7' />
            </linearGradient>
            <linearGradient id='fur-empty' x1='316' y1='238' x2='714' y2='812' gradientUnits='userSpaceOnUse'>
              <stop offset='0' stopColor='#D3B895' />
              <stop offset='1' stopColor='#8B684B' />
            </linearGradient>
          </defs>
          <rect width='1024' height='1024' rx='224' fill='url(#tile-empty)' />
          <circle cx='298' cy='354' r='128' fill='#9A7858' />
          <circle cx='726' cy='354' r='128' fill='#9A7858' />
          <circle cx='298' cy='354' r='70' fill='#F0D9B4' />
          <circle cx='726' cy='354' r='70' fill='#F0D9B4' />
          <ellipse cx='512' cy='602' rx='186' ry='232' fill='url(#fur-empty)' />
          <circle cx='512' cy='406' r='228' fill='url(#fur-empty)' />
          <circle cx='407' cy='420' r='104' fill='#FFFDF5' />
          <circle cx='617' cy='420' r='104' fill='#FFFDF5' />
          <circle cx='407' cy='420' r='72' fill='#15262D' />
          <circle cx='617' cy='420' r='72' fill='#15262D' />
          <rect x='332' y='620' width='360' height='232' rx='42' fill='#FFFFFF' />
          <path fill='#0D6D70' d='m411 700 36-36 65 65 65-65 36 36-101 101-101-101Z' />
        </svg>
        <h1 className='app-title'>mdviewy</h1>
        <p className='tagline'>Your Markdown. Your files. Your flow.</p>

        <div className='primary-actions'>
          <ActionButton $variant='primary' onClick={openFolderDialog}>
            <i className='ri-folder-open-line' />
            <span>{t('file.openDir')}</span>
            <kbd>⌘O</kbd>
          </ActionButton>
          <div className='secondary-row'>
            <ActionButton onClick={openFile}>
              <i className='ri-file-line' />
              <span>{t('file.openFile')}</span>
            </ActionButton>
            <ActionButton onClick={() => addNewMarkdownFileEdit({ fileName: 'new-file.md', content: '' })}>
              <i className='ri-add-line' />
              <span>{t('action.create_file')}</span>
            </ActionButton>
          </div>
        </div>

        <p className='trust-note'>
          <i className='ri-shield-check-line' />
          Local-first. No account. Nothing is indexed until you choose a folder.
        </p>

        <div className='shortcuts'>
          <span><kbd>⌘P</kbd> Quick open</span>
          <span><kbd>⌘K</kbd> Search</span>
          <span><kbd>⌘N</kbd> New file</span>
        </div>
      </div>
    </Container>
  )
})

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-y: auto;
  padding: 64px 32px 48px;
  box-sizing: border-box;
  background-color: ${({ theme }) => theme.bgColor};
  color: ${({ theme }) => theme.primaryFontColor};

  .hero {
    width: 100%;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .logo-mark {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    box-shadow: 0 8px 24px -8px rgba(13, 44, 53, 0.45);
    margin-bottom: 18px;
  }

  .app-title {
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: -0.75px;
    margin: 0;
    color: ${({ theme }) => theme.primaryFontColor};
  }

  .tagline {
    margin: 6px 0 28px;
    font-size: 0.9rem;
    color: ${({ theme }) => theme.labelFontColor};
    opacity: 0.85;
  }

  .primary-actions {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .secondary-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .trust-note {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 18px 0 0;
    font-size: 0.74rem;
    color: ${({ theme }) => theme.labelFontColor};
    opacity: 0.78;
  }

  .shortcuts {
    margin-top: 28px;
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    justify-content: center;
    font-size: 0.72rem;
    color: ${({ theme }) => theme.labelFontColor};
    opacity: 0.7;

    kbd {
      font-family: 'SF Mono', ui-monospace, monospace;
      font-size: 0.68rem;
      padding: 1px 5px;
      margin-right: 4px;
      border-radius: 4px;
      border: 1px solid ${({ theme }) => theme.borderColor || 'rgba(127,127,127,0.25)'};
      background-color: ${({ theme }) => theme.bgColorSecondary};
    }
  }
`

const ActionButton = styled.button<{ $variant?: 'primary' }>`
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  border: 1px solid ${(p) => (p.$variant === 'primary' ? 'transparent' : p.theme.borderColor || 'rgba(127,127,127,0.22)')};
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.08s ease, background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  background-color: ${(p) => (p.$variant === 'primary' ? '#6366f1' : p.theme.bgColorSecondary)};
  color: ${(p) => (p.$variant === 'primary' ? '#fff' : p.theme.primaryFontColor)};
  box-shadow: ${(p) => (p.$variant === 'primary' ? '0 4px 14px -6px rgba(99,102,241,0.55)' : 'none')};

  i {
    font-size: 1rem;
    opacity: 0.9;
  }

  kbd {
    margin-left: auto;
    font-family: 'SF Mono', ui-monospace, monospace;
    font-size: 0.7rem;
    padding: 1px 5px;
    border-radius: 4px;
    background-color: ${(p) => (p.$variant === 'primary' ? 'rgba(255,255,255,0.18)' : p.theme.bgColor)};
    border: 1px solid ${(p) => (p.$variant === 'primary' ? 'rgba(255,255,255,0.2)' : p.theme.borderColor || 'rgba(127,127,127,0.18)')};
    color: inherit;
    opacity: 0.85;
  }

  &:hover {
    background-color: ${(p) => (p.$variant === 'primary' ? '#5457e0' : p.theme.hoverColor)};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`
