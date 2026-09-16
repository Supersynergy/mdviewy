import { FileResultCode, FileSysResult } from '@/helper/filesys'
import { invoke } from '@tauri-apps/api/core'
import { openPath } from '@tauri-apps/plugin-opener'
import { FC, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { Button } from 'zens'

interface PdfPreviewProps {
  filePath?: string
}

type LoadState = { status: 'loading' } | { status: 'ok' } | { status: 'error'; message: string }

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function renderPdf(container: HTMLElement, bytes: Uint8Array) {
  const [pdfjs, workerUrlModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrlModule.default

  const doc = await pdfjs.getDocument({ data: bytes }).promise
  const width = container.clientWidth || 720

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const baseViewport = page.getViewport({ scale: 1 })
    const scale = Math.min((width - 48) / baseViewport.width, 2) * (window.devicePixelRatio || 1)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    canvas.style.width = `${Math.floor(viewport.width / (window.devicePixelRatio || 1))}px`
    canvas.className = 'pdf-page'
    container.appendChild(canvas)

    await page.render({
      canvas,
      viewport,
    }).promise
  }
}

export const PdfPreview: FC<PdfPreviewProps> = ({ filePath }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current
    if (!filePath || !container) return

    invoke<FileSysResult>('read_u8_array_from_file', { filePath })
      .then(async (res) => {
        if (cancelled) return
        if (res.code !== FileResultCode.Success) {
          setState({ status: 'error', message: res.content || 'Could not read file' })
          return
        }
        try {
          await renderPdf(container, base64ToBytes(res.content))
          if (!cancelled) setState({ status: 'ok' })
        } catch (error) {
          if (!cancelled) setState({ status: 'error', message: String(error) })
        }
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', message: String(error) })
      })

    return () => {
      cancelled = true
      container.replaceChildren()
    }
  }, [filePath])

  return (
    <Container>
      {state.status === 'loading' && <Status>Loading PDF…</Status>}
      {state.status === 'error' && (
        <Status>
          <p>Could not render PDF: {state.message}</p>
          {filePath && (
            <Button onClick={() => void openPath(filePath).catch(() => {})}>Open externally</Button>
          )}
        </Status>
      )}
      <Pages ref={containerRef} />
    </Container>
  )
}

const Container = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto;
`

const Pages = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;

  .pdf-page {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
    border-radius: 2px;
    background: white;
    max-width: 100%;
    height: auto;
  }
`

const Status = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  padding: 48px 24px;
  color: ${(p) => p.theme.labelFontColor};
`
