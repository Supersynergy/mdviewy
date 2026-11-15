import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { RtfPreview } from './RtfPreview'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

vi.mock('@tauri-apps/api/core', () => ({
  invoke: async () => ({ code: 'Success', content: String.raw`{\rtf1 Userantwort:\par >>>Userantwort: Ja}` }),
}))
vi.mock('zens', () => ({ Button: 'button' }))

it('marks exported and literal answer fields only in handoff previews', async () => {
  const host = document.createElement('div')
  const root = createRoot(host)
  try {
    await act(async () => root.render(<RtfPreview filePath='/tmp/_handoff-test.rtf' />))
    expect(host.querySelector('[data-answer="open"]')?.textContent).toBe('Userantwort:')
    expect(host.querySelector('[data-answer="answered"]')?.textContent).toBe('>>>Userantwort: Ja')
    await act(async () => root.render(<RtfPreview filePath='/tmp/brief.rtf' />))
    expect(host.querySelector('[data-answer]')).toBeNull()
    expect(host.textContent).toContain('Userantwort:')
  } finally { await act(async () => root.unmount()) }
})
