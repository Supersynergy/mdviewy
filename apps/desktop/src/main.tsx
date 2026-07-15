// Startup benchmark marker — printed to webview console + sent to Tauri stdout.
declare global {
  interface Window { __MDM_BOOT__?: number; openedUrls: string | string[] | null }
}
window.__MDM_BOOT__ = performance.now()
;(window as any).__mdm_log_boot = (label: string) => {
  const t = performance.now() - (window.__MDM_BOOT__ || 0)
  console.log(`[mdviewy.boot] ${label}: ${t.toFixed(1)}ms`)
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HoxRoot } from 'hox'
import { enableMapSet } from 'immer'
import { StrictMode, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { initErrorReporting } from './errorReporting'
import './atom.css'
import './normalize.css'
import './remixicon-subset.css'

void initErrorReporting(import.meta.env.VITE_SENTRY_DSN)

enableMapSet()

const queryClient = new QueryClient()

// Zero-dep Suspense fallback. The pre-React skeleton in index.html stays
// visible until #root is non-empty, so this is only rendered if a suspense
// boundary fires AFTER hydration — keep it lightweight and dependency-free.
const FallbackSpinner = () => (
  <div
    style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <svg
      viewBox='0 0 1024 1024'
      role='img'
      aria-label='mdviewy'
      style={{ width: 176, height: 176, animation: 'mdf-pulse 1.4s ease-in-out infinite' }}
    >
      <defs>
        <linearGradient id='tile-suspense' x1='120' y1='70' x2='900' y2='960' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#0D2C35' />
          <stop offset='.5' stopColor='#166870' />
          <stop offset='1' stopColor='#72D6C7' />
        </linearGradient>
        <linearGradient id='fur-suspense' x1='316' y1='238' x2='714' y2='812' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#D3B895' />
          <stop offset='1' stopColor='#8B684B' />
        </linearGradient>
      </defs>
      <rect width='1024' height='1024' rx='224' fill='url(#tile-suspense)' />
      <circle cx='298' cy='354' r='128' fill='#9A7858' />
      <circle cx='726' cy='354' r='128' fill='#9A7858' />
      <circle cx='298' cy='354' r='70' fill='#F0D9B4' />
      <circle cx='726' cy='354' r='70' fill='#F0D9B4' />
      <ellipse cx='512' cy='602' rx='186' ry='232' fill='url(#fur-suspense)' />
      <circle cx='512' cy='406' r='228' fill='url(#fur-suspense)' />
      <circle cx='407' cy='420' r='104' fill='#FFFDF5' />
      <circle cx='617' cy='420' r='104' fill='#FFFDF5' />
      <circle cx='407' cy='420' r='72' fill='#15262D' />
      <circle cx='617' cy='420' r='72' fill='#15262D' />
      <rect x='332' y='620' width='360' height='232' rx='42' fill='#FFFFFF' />
      <path fill='#0D6D70' d='m411 700 36-36 65 65 65-65 36 36-101 101-101-101Z' />
    </svg>
  </div>
)

const Main = () => {
  return (
    <Suspense fallback={<FallbackSpinner />}>
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
    <AppErrorBoundary>
      <HoxRoot>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Main />
          </BrowserRouter>
        </QueryClientProvider>
      </HoxRoot>
    </AppErrorBoundary>
  </StrictMode>,
)
requestAnimationFrame(() => {
  ;(window as any).__mdm_log_boot('first-frame')
})
