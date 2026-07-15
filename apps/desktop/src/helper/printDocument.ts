export const PRINT_BODY_CLASS = 'mdviewy-printing'

export const printActiveDocument = (
  targetWindow: Window = window,
  targetDocument: Document = document,
) => {
  const cleanup = () => {
    targetDocument.body.classList.remove(PRINT_BODY_CLASS)
    targetWindow.removeEventListener('afterprint', cleanup)
    targetWindow.clearTimeout(fallbackTimer)
  }

  targetDocument.body.classList.add(PRINT_BODY_CLASS)
  targetWindow.addEventListener('afterprint', cleanup, { once: true })
  const fallbackTimer = targetWindow.setTimeout(cleanup, 60_000)

  try {
    targetWindow.print()
  } catch (error) {
    cleanup()
    throw error
  }
}
