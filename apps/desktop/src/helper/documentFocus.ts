const DOCUMENT_FOCUS_EVENT = 'mdviewy:document-focus'

let pendingDocumentFocus = false

export const requestDocumentFocus = () => {
  pendingDocumentFocus = true
  window.dispatchEvent(new Event(DOCUMENT_FOCUS_EVENT))
}

export const subscribeDocumentFocus = (handler: () => void) => {
  const handleFocus = () => {
    pendingDocumentFocus = false
    handler()
  }

  window.addEventListener(DOCUMENT_FOCUS_EVENT, handleFocus)

  if (pendingDocumentFocus) {
    queueMicrotask(handleFocus)
  }

  return () => window.removeEventListener(DOCUMENT_FOCUS_EVENT, handleFocus)
}
