import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requestDocumentFocus, subscribeDocumentFocus } from './documentFocus'

describe('document focus requests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('delivers live requests once', () => {
    const handler = vi.fn()
    const unsubscribe = subscribeDocumentFocus(handler)

    requestDocumentFocus()

    expect(handler).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('replays an early open after the layout subscribes', async () => {
    requestDocumentFocus()
    const handler = vi.fn()
    const unsubscribe = subscribeDocumentFocus(handler)

    await Promise.resolve()

    expect(handler).toHaveBeenCalledTimes(1)
    unsubscribe()
  })
})
