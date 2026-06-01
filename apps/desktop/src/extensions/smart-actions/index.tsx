import type { RightBarItem } from '@/components/SideBar'
import { RIGHTBARITEMKEYS } from '@/constants'
import { getFileObject } from '@/helper/files'
import { useEditorStore } from '@/stores'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { Command } from '@tauri-apps/plugin-shell'
import { memo, useMemo } from 'react'
import styled from 'styled-components'
import { toast } from 'zens'

type ActionFn = (file: { path?: string; name: string; id: string }) => void | Promise<void>
type ActionGroup = { title: string; items: ActionItem[] }
type ActionItem = {
  icon: string
  label: string
  hint?: string
  run: ActionFn
  disabled?: (file: { path?: string }) => boolean
}

const folderOf = (p?: string) => {
  if (!p) return ''
  const ix = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return ix > 0 ? p.slice(0, ix) : p
}

const fileNameOf = (p?: string) => {
  if (!p) return ''
  return p.split(/[\\/]/).pop() || p
}

const openInOsTerminal = async (dir: string) => {
  const isMac = navigator.platform.toLowerCase().includes('mac')
  const isWin = navigator.platform.toLowerCase().includes('win')
  if (isMac) {
    await runShell('open', ['-a', 'Terminal', dir])
  } else if (isWin) {
    await runShell('cmd', ['/c', 'start', '', 'cmd', '/k', `cd /d "${dir}"`])
  } else {
    // Linux — try common terminals via xdg-open of folder; user can launch term themselves.
    await runShell('xdg-open', [dir])
  }
}

const openFolder = async (dir: string) => {
  const isMac = navigator.platform.toLowerCase().includes('mac')
  const isWin = navigator.platform.toLowerCase().includes('win')
  if (isMac) {
    await runShell('open', [dir])
  } else if (isWin) {
    await runShell('cmd', ['/c', 'start', '', dir])
  } else {
    await runShell('xdg-open', [dir])
  }
}

const runShell = async (program: string, args: string[]) => {
  try {
    const cmd = Command.create(program, args)
    const out = await cmd.execute()
    if (out.code !== 0) {
      toast.error(`${program} exited ${out.code}: ${out.stderr || out.stdout}`.slice(0, 200))
    }
  } catch (err: any) {
    toast.error(`${program} failed: ${err?.message ?? err}`)
  }
}

const ACTION_GROUPS: ActionGroup[] = [
  {
    title: 'Clipboard',
    items: [
      {
        icon: 'ri-file-copy-line',
        label: 'Copy absolute path',
        hint: '/abs/path/to/file.md',
        run: async (f) => {
          if (!f.path) return
          await writeText(f.path)
          toast.success('Path copied')
        },
        disabled: (f) => !f.path,
      },
      {
        icon: 'ri-folder-line',
        label: 'Copy folder path',
        hint: 'Parent directory',
        run: async (f) => {
          const p = folderOf(f.path)
          if (!p) return
          await writeText(p)
          toast.success('Folder copied')
        },
        disabled: (f) => !f.path,
      },
      {
        icon: 'ri-links-line',
        label: 'Copy as Markdown link',
        hint: '[name](path)',
        run: async (f) => {
          if (!f.path) return
          await writeText(`[${fileNameOf(f.path)}](${f.path})`)
          toast.success('Markdown link copied')
        },
        disabled: (f) => !f.path,
      },
      {
        icon: 'ri-double-quotes-l',
        label: 'Copy as Wiki link',
        hint: '[[file]]',
        run: async (f) => {
          const name = (fileNameOf(f.path) || f.name).replace(/\.md$/i, '')
          await writeText(`[[${name}]]`)
          toast.success('Wiki link copied')
        },
      },
      {
        icon: 'ri-at-line',
        label: 'Copy as @-mention',
        hint: '@/relative/path (for Claude Code)',
        run: async (f) => {
          if (!f.path) return
          await writeText(`@${f.path}`)
          toast.success('@-mention copied')
        },
        disabled: (f) => !f.path,
      },
    ],
  },
  {
    title: 'Reveal & Open',
    items: [
      {
        icon: 'ri-eye-line',
        label: 'Reveal in Finder',
        run: async (f) => {
          if (!f.path) return
          await revealItemInDir(f.path)
        },
        disabled: (f) => !f.path,
      },
      {
        icon: 'ri-folder-open-line',
        label: 'Open containing folder',
        run: async (f) => {
          const dir = folderOf(f.path)
          if (!dir) return
          await openFolder(dir)
        },
        disabled: (f) => !f.path,
      },
      {
        icon: 'ri-terminal-box-line',
        label: 'Open Terminal here',
        hint: 'cd to folder',
        run: async (f) => {
          const dir = folderOf(f.path)
          if (!dir) return
          // macOS: open -a Terminal; Linux: gnome-terminal/xterm; Windows: wt
          await openInOsTerminal(dir)
        },
        disabled: (f) => !f.path,
      },
      {
        icon: 'ri-code-s-slash-line',
        label: 'Open in VS Code',
        run: async (f) => {
          if (!f.path) return
          await runShell('code', [f.path])
        },
        disabled: (f) => !f.path,
      },
    ],
  },
  {
    title: 'Assistant handoff',
    items: [
      {
        icon: 'ri-sparkling-2-line',
        label: 'Open folder in Claude Code',
        hint: 'launches `claude` in folder',
        run: async (f) => {
          const dir = folderOf(f.path)
          if (!dir) return
          await openInOsTerminal(dir)
          // Pre-fill prompt via cmux? — fallback: terminal opens, user types `claude`.
          await writeText(`cd "${dir}" && claude`)
          toast.success('Folder open + command copied: paste in terminal')
        },
        disabled: (f) => !f.path,
      },
      {
        icon: 'ri-robot-2-line',
        label: 'Open folder in Codex',
        hint: 'launches `codex` in folder',
        run: async (f) => {
          const dir = folderOf(f.path)
          if (!dir) return
          await openInOsTerminal(dir)
          await writeText(`cd "${dir}" && codex`)
          toast.success('Folder open + command copied')
        },
        disabled: (f) => !f.path,
      },
      {
        icon: 'ri-quote-text',
        label: 'Copy "Improve this file" prompt',
        hint: 'Claude/Codex-ready',
        run: async (f) => {
          if (!f.path) return
          await writeText(
            `Read @${f.path} and propose 5 specific improvements. Format: file:line — issue — fix.`,
          )
          toast.success('Prompt copied')
        },
        disabled: (f) => !f.path,
      },
      {
        icon: 'ri-quote-text',
        label: 'Copy "Summarize" prompt',
        run: async (f) => {
          if (!f.path) return
          await writeText(`Summarize @${f.path} in 5 bullets, no fluff.`)
          toast.success('Prompt copied')
        },
        disabled: (f) => !f.path,
      },
    ],
  },
]

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: 12px 10px 24px;
  gap: 14px;
  color: ${(p) => p.theme.primaryFontColor};
`

const FileCard = styled.div`
  padding: 10px 12px;
  border-radius: 10px;
  background: ${(p) => p.theme.bgColorSecondary};
  border: 1px solid ${(p) => p.theme.borderColor || 'rgba(127,127,127,0.18)'};
  font-size: 0.78rem;

  .name {
    font-weight: 600;
    font-size: 0.85rem;
    color: ${(p) => p.theme.primaryFontColor};
    word-break: break-all;
  }

  .path {
    margin-top: 4px;
    font-family: 'SF Mono', ui-monospace, monospace;
    font-size: 0.7rem;
    color: ${(p) => p.theme.labelFontColor};
    word-break: break-all;
    opacity: 0.8;
  }

  .empty {
    color: ${(p) => p.theme.labelFontColor};
    opacity: 0.7;
  }
`

const Group = styled.div`
  .group-title {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${(p) => p.theme.labelFontColor};
    opacity: 0.75;
    margin: 4px 4px 6px;
  }
`

const Row = styled.button<{ $disabled?: boolean }>`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 0;
  background: transparent;
  border-radius: 8px;
  color: ${(p) => p.theme.primaryFontColor};
  cursor: ${(p) => (p.$disabled ? 'not-allowed' : 'pointer')};
  opacity: ${(p) => (p.$disabled ? 0.4 : 1)};
  text-align: left;
  font-size: 0.82rem;
  transition: background 100ms ease;

  &:hover {
    background: ${(p) => (p.$disabled ? 'transparent' : p.theme.hoverColor)};
  }

  i {
    font-size: 16px;
    color: ${(p) => p.theme.accentColor};
    flex: 0 0 auto;
  }

  .body {
    flex: 1;
    min-width: 0;
  }

  .label {
    font-weight: 500;
    line-height: 1.2;
  }

  .hint {
    margin-top: 2px;
    font-size: 0.7rem;
    color: ${(p) => p.theme.labelFontColor};
    opacity: 0.75;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const SmartActionsPanel = memo(() => {
  const { activeId } = useEditorStore()

  const file = useMemo(() => {
    if (!activeId) return null
    const f = getFileObject(activeId)
    if (!f) return null
    return { path: f.path, name: f.name || fileNameOf(f.path) || 'untitled', id: f.id }
  }, [activeId])

  return (
    <Container>
      <FileCard>
        {file ? (
          <>
            <div className='name'>{file.name}</div>
            <div className='path'>{file.path || '(unsaved)'}</div>
          </>
        ) : (
          <div className='empty'>Open a file to enable smart actions.</div>
        )}
      </FileCard>

      {ACTION_GROUPS.map((group) => (
        <Group key={group.title}>
          <div className='group-title'>{group.title}</div>
          {group.items.map((a) => {
            const disabled = !file || (a.disabled ? a.disabled(file) : false)
            return (
              <Row
                key={a.label}
                $disabled={disabled}
                disabled={disabled}
                onClick={() => file && !disabled && a.run(file)}
                title={a.hint || a.label}
              >
                <i className={a.icon} />
                <div className='body'>
                  <div className='label'>{a.label}</div>
                  {a.hint && <div className='hint'>{a.hint}</div>}
                </div>
              </Row>
            )
          })}
        </Group>
      ))}
    </Container>
  )
})

SmartActionsPanel.displayName = 'SmartActionsPanel'

const smartActionsExtension: RightBarItem = {
  title: RIGHTBARITEMKEYS.SmartActions,
  key: RIGHTBARITEMKEYS.SmartActions,
  icon: <i className='ri-sparkling-2-line icon-base' />,
  components: <SmartActionsPanel />,
}

export default smartActionsExtension
