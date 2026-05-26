// Startup benchmark marker — printed to webview console + sent to Tauri stdout.
declare global {
  interface Window { __MDM_BOOT__?: number; openedUrls: string | null }
}
window.__MDM_BOOT__ = performance.now()
;(window as any).__mdm_log_boot = (label: string) => {
  const t = performance.now() - (window.__MDM_BOOT__ || 0)
  console.log(`[mdviewy.boot] ${label}: ${t.toFixed(1)}ms`)
}

import { lightTheme } from '@mdviewy/theme'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HoxRoot } from 'hox'
import { enableMapSet } from 'immer'
import { StrictMode, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { Spinners } from 'zens'
import App from './App'
import { initErrorReporting } from './errorReporting'
import './atom.css'
import './normalize.css'
import './remixicon-subset.css'

void initErrorReporting(import.meta.env.VITE_SENTRY_DSN)

enableMapSet()

const queryClient = new QueryClient()

const Main = () => {
  return (
    <Suspense
      fallback={
        <div
          style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spinners.BarLoader color={lightTheme.styledConstants.accentColor} width={200} />
        </div>
      }
    >
      <App />
    </Suspense>
  )
}

const rootElement = document.getElementById('root')!
rootElement.addEventListener('dragover', (e) => {
  e.preventDefault()
})
rootElement.addEventListener('drop', (event) => {
  event.preventDefault()
})

;(window as any).__mdm_log_boot('before-render')
ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <HoxRoot>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Main />
        </BrowserRouter>
      </QueryClientProvider>
    </HoxRoot>
  </StrictMode>,
)
requestAnimationFrame(() => {
  ;(window as any).__mdm_log_boot('first-frame')
})
