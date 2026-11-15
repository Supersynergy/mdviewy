import { FileResultCode, FileSysResult } from '@/helper/filesys'
import { answerStatus, isHandoffFile } from '@/helper/handoff'
import { rtfToText } from '@/helper/rtfToText'
import { invoke } from '@tauri-apps/api/core'
import { openPath } from '@tauri-apps/plugin-opener'
import { FC, useEffect, useState } from 'react'
import styled from 'styled-components'
import { Button } from 'zens'

interface RtfPreviewProps {
  filePath?: string
}

type LoadState = { status: 'loading' } | { status: 'ok'; text: string } | { status: 'error'; message: string }

export const RtfPreview: FC<RtfPreviewProps> = ({ filePath }) => {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    if (!filePath) {
      setState({ status: 'error', message: 'No file path' })
      return
    }
    invoke<FileSysResult>('get_file_content', { filePath })
      .then((res) => {
        if (cancelled) return
        if (res.code !== FileResultCode.Success) {
          setState({ status: 'error', message: res.content || 'Could not read file' })
          return
        }
        setState({ status: 'ok', text: rtfToText(res.content) })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', message: String(error) })
      })
    return () => {
      cancelled = true
    }
  }, [filePath])

  if (state.status === 'loading') return <Container aria-busy='true' />
  if (state.status === 'error') {
    return (
      <Container>
        <ErrorBlock>
          <p>Could not render RTF: {state.message}</p>
          {filePath && (
            <Button onClick={() => void openPath(filePath).catch(() => {})}>Open externally</Button>
          )}
        </ErrorBlock>
      </Container>
    )
  }

  return (
    <Container>
      <DocumentText>{isHandoffFile(filePath) && state.text
        ? state.text.split('\n').map((line, i) => <div key={i} data-answer={answerStatus(line)}>{line || ' '}</div>)
        : state.text || ' '}</DocumentText>
    </Container>
  )
}

const Container = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  justify-content: center;
`

const DocumentText = styled.div`
  [data-answer] { border-inline-start: 3px solid; padding-inline-start: 0.6em; }
  [data-answer='open'] { border-color: #c58a16; background: rgba(215,158,33,.16); }
  [data-answer='answered'] { border-color: #369a77; background: rgba(48,157,117,.12); }
  max-width: 720px;
  width: 100%;
  padding: 32px 24px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.65;
  color: ${(p) => p.theme.primaryFontColor};
`

const ErrorBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  padding: 48px 24px;
  color: ${(p) => p.theme.labelFontColor};
`
