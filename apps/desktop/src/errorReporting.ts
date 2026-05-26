export async function initErrorReporting(dsn: string | undefined) {
  if (!dsn) return

  const Sentry = await import('@sentry/react')
  Sentry.init({
    dsn,
    integrations: [],
  })
}

export async function captureError(error: unknown) {
  const Sentry = await import('@sentry/react')
  Sentry.captureException(error)
}
