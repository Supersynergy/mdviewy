import { captureError } from '@/errorReporting'
import { invoke } from '@tauri-apps/api/core'
import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error?: Error }

const PANEL_LAYOUT_KEY = 'react-resizable-panels:root-resize-panel'

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {}

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[mdviewy] UI recovery boundary', error, info)
    void captureError(error)
  }

  private reload = () => window.location.reload()

  private safeStart = async () => {
    try {
      localStorage.removeItem(PANEL_LAYOUT_KEY)
      await invoke('clear_recent_workspaces')
    } finally {
      window.location.reload()
    }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <div style={styles.mark}>md</div>
          <h1 style={styles.title}>mdviewy hit a problem</h1>
          <p style={styles.copy}>
            Your files were not changed. Reload the window, or start safely without reopening the
            last workspace.
          </p>
          <div style={styles.actions}>
            <button style={styles.primaryButton} onClick={this.reload}>Reload</button>
            <button style={styles.secondaryButton} onClick={this.safeStart}>Start safely</button>
          </div>
          <details style={styles.details}>
            <summary>Technical details</summary>
            <code>{this.state.error.message.slice(0, 500)}</code>
          </details>
        </div>
      </main>
    )
  }
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    alignItems: 'center',
    background: '#0d2026',
    color: '#f7fbfa',
    display: 'flex',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 24,
  },
  card: { maxWidth: 460, textAlign: 'center' },
  mark: {
    alignItems: 'center',
    background: '#70d4c5',
    borderRadius: 14,
    color: '#0d2c35',
    display: 'inline-flex',
    fontSize: 18,
    fontWeight: 800,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  title: { fontSize: 24, letterSpacing: '-0.03em', margin: '20px 0 8px' },
  copy: { color: '#bed0d1', lineHeight: 1.55, margin: 0 },
  actions: { display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 },
  primaryButton: {
    background: '#70d4c5',
    border: 0,
    borderRadius: 8,
    color: '#0d2c35',
    cursor: 'pointer',
    fontWeight: 700,
    padding: '10px 18px',
  },
  secondaryButton: {
    background: 'transparent',
    border: '1px solid #547177',
    borderRadius: 8,
    color: '#f7fbfa',
    cursor: 'pointer',
    fontWeight: 600,
    padding: '10px 18px',
  },
  details: { color: '#8ba5a8', fontSize: 12, marginTop: 24, textAlign: 'left' },
}
