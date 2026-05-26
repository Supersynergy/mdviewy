import { openUrl } from '@tauri-apps/plugin-opener'
import { useEffect } from 'react'

const EXTERNAL_RE = /^(https?:|mailto:|tel:|ftp:)/i

export const useExternalLinks = () => {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const a = target.closest('a') as HTMLAnchorElement | null
      if (!a) return
      const href = a.getAttribute('href') || ''
      if (!href || !EXTERNAL_RE.test(href)) return
      e.preventDefault()
      e.stopPropagation()
      openUrl(href).catch(() => window.open(href, '_blank'))
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [])
}
