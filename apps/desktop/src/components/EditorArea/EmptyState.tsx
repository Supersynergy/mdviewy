import { useOpen } from '@/hooks'
import { addNewMarkdownFileEdit } from '@/services/editor-file'
import { homeDir } from '@tauri-apps/api/path'
import { invoke } from '@tauri-apps/api/core'
import { memo, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

type Suggestion = {
  key: string
  label: string
  hint: string
  icon: string
  subpath: string
}

const SUGGESTIONS: Suggestion[] = [
  { key: 'downloads', label: 'Downloads', hint: 'Recently saved .md files', icon: 'ri-download-cloud-2-line', subpath: 'Downloads' },
  { key: 'documents', label: 'Documents', hint: 'Notes & long-form drafts', icon: 'ri-file-text-line', subpath: 'Documents' },
  { key: 'claude', label: 'Claude Code', hint: 'CLAUDE.md, skills, memory', icon: 'ri-sparkling-2-line', subpath: '.claude' },
  { key: 'codex', label: 'Codex', hint: 'AGENTS.md & generated docs', icon: 'ri-terminal-box-line', subpath: '.codex' },
  { key: 'projects', label: 'Projects', hint: 'Workspaces & READMEs', icon: 'ri-stack-line', subpath: 'projects' },
  { key: 'obsidian', label: 'Obsidian Vault', hint: 'Personal knowledge base', icon: 'ri-book-2-line', subpath: 'Obsidian' },
]

const DISMISS_KEY = 'mdviewy.onboarding.dismissed'

export const EmptyState = memo(() => {
  const { t } = useTranslation()
  const { openFolderDialog, openFolder, openFile } = useOpen()
  const [home, setHome] = useState<string>('')
  const [available, setAvailable] = useState<Set<string>>(new Set())
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })

  useEffect(() => {
    let cancel = false
    homeDir().then(async (h) => {
      if (cancel) return
      setHome(h)
      const checks = await Promise.all(
        SUGGESTIONS.map(async (s) => {
          const full = `${h.replace(/\/$/, '')}/${s.subpath}`
          try { return (await invoke<boolean>('file_exists', { filePath: full })) ? s.key : null } catch { return null }
        }),
      )
      if (!cancel) setAvailable(new Set(checks.filter(Boolean) as string[]))
    })
    return () => { cancel = true }
  }, [])

  const visibleSuggestions = useMemo(
    () => SUGGESTIONS.filter((s) => available.has(s.key)),
    [available],
  )

  const handleSuggestion = (s: Suggestion) => {
    if (!home) return
    const full = `${home.replace(/\/$/, '')}/${s.subpath}`
    openFolder(full)
  }

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
    setDismissed(true)
  }

  return (
    <Container className='w-full h-full'>
      <div className='hero'>
        <div className='logo-mark'>
          <span className='logo-glyph'>md</span>
        </div>
        <h1 className='app-title'>MDviewy</h1>
        <p className='tagline'>A calm place to read & write markdown.</p>

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

        {!dismissed && visibleSuggestions.length > 0 && (
          <div className='onboarding'>
            <div className='onboarding-head'>
              <div>
                <div className='onboarding-title'>Quick start — index a library</div>
                <div className='onboarding-sub'>
                  We detected these folders in your home. One click adds them.
                </div>
              </div>
              <button className='dismiss' onClick={dismiss} title='Hide this section'>
                <i className='ri-close-line' />
              </button>
            </div>
            <div className='chip-grid'>
              {visibleSuggestions.map((s) => (
                <Chip key={s.key} onClick={() => handleSuggestion(s)}>
                  <i className={`chip-icon ${s.icon}`} />
                  <div className='chip-body'>
                    <div className='chip-label'>{s.label}</div>
                    <div className='chip-hint'>{s.hint}</div>
                  </div>
                  <i className='chip-arrow ri-arrow-right-up-line' />
                </Chip>
              ))}
            </div>
          </div>
        )}

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
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
    box-shadow: 0 8px 24px -8px rgba(99, 102, 241, 0.55);
    margin-bottom: 18px;
  }

  .logo-glyph {
    font-family: 'SF Mono', ui-monospace, monospace;
    font-weight: 700;
    font-size: 20px;
    color: #fff;
    letter-spacing: -0.5px;
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

  .onboarding {
    width: 100%;
    margin-top: 32px;
    padding: 18px;
    border-radius: 12px;
    border: 1px solid ${({ theme }) => theme.borderColor || 'rgba(127,127,127,0.18)'};
    background-color: ${({ theme }) => theme.bgColorSecondary};
  }

  .onboarding-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }

  .onboarding-title {
    font-size: 0.88rem;
    font-weight: 600;
    color: ${({ theme }) => theme.primaryFontColor};
  }

  .onboarding-sub {
    margin-top: 3px;
    font-size: 0.76rem;
    color: ${({ theme }) => theme.labelFontColor};
    opacity: 0.85;
  }

  .dismiss {
    background: transparent;
    border: 0;
    color: ${({ theme }) => theme.labelFontColor};
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    font-size: 14px;
    line-height: 1;
    opacity: 0.6;
    transition: opacity 0.15s ease, background 0.15s ease;

    &:hover {
      opacity: 1;
      background-color: ${({ theme }) => theme.hoverColor};
    }
  }

  .chip-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
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

const Chip = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.borderColor || 'rgba(127,127,127,0.18)'};
  background-color: ${({ theme }) => theme.bgColor};
  color: ${({ theme }) => theme.primaryFontColor};
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.08s ease;

  .chip-icon {
    font-size: 18px;
    color: #6366f1;
    flex: 0 0 auto;
  }

  .chip-body {
    flex: 1;
    min-width: 0;
  }

  .chip-label {
    font-size: 0.82rem;
    font-weight: 600;
    line-height: 1.1;
  }

  .chip-hint {
    margin-top: 2px;
    font-size: 0.7rem;
    color: ${({ theme }) => theme.labelFontColor};
    opacity: 0.8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chip-arrow {
    font-size: 14px;
    opacity: 0;
    transform: translate(-4px, 2px);
    transition: opacity 0.15s ease, transform 0.15s ease;
  }

  &:hover {
    border-color: #6366f1;
    background-color: ${({ theme }) => theme.hoverColor};
    transform: translateY(-1px);

    .chip-arrow {
      opacity: 0.7;
      transform: translate(0, 0);
    }
  }
`
