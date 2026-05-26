import { MfIconLabelButton } from '@/components/ui-v2/Button/icon-label-button'
import { showContextMenu } from '@/components/ui-v2/ContextMenu'
import { getFileObject } from '@/helper/files'
import { useEditorStore } from '@/stores'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { Command } from '@tauri-apps/plugin-shell'
import { useCallback, useRef } from 'react'
import { toast } from 'zens'

const folderOf = (p?: string) => {
  if (!p) return ''
  const ix = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return ix > 0 ? p.slice(0, ix) : p
}

const openInOsTerminal = async (dir: string) => {
  const isMac = navigator.platform.toLowerCase().includes('mac')
  const isWin = navigator.platform.toLowerCase().includes('win')
  if (isMac) {
    await runShell('open', ['-a', 'Terminal', dir])
  } else if (isWin) {
    await runShell('cmd', ['/c', 'start', '', 'cmd', '/k', `cd /d "${dir}"`])
  } else {
    await runShell('xdg-open', [dir])
  }
}

const runShell = async (program: string, args: string[]) => {
  try {
    const cmd = Command.create(program, args)
    const out = await cmd.execute()
    if (out.code !== 0) {
      toast.error(`${program} exited ${out.code}`.slice(0, 200))
    }
  } catch (err: any) {
    toast.error(`${program} failed: ${err?.message ?? err}`)
  }
}

export const SmartActionsButton = () => {
  const { activeId } = useEditorStore()
  const ref = useRef<any>(null)
  const curFile = activeId ? getFileObject(activeId) : undefined

  const handleClick = useCallback(() => {
    const rect = ref.current?.getBoundingClientRect?.()
    if (!rect || !curFile) return
    const path = curFile.path
    const dir = folderOf(path)

    showContextMenu({
      x: rect.x,
      y: rect.y + rect.height,
      items: [
        {
          label: 'Copy absolute path',
          value: 'copy-path',
          handler: async () => {
            if (!path) return
            await writeText(path)
            toast.success('Path copied')
          },
        },
        {
          label: 'Copy folder path',
          value: 'copy-folder',
          handler: async () => {
            if (!dir) return
            await writeText(dir)
            toast.success('Folder copied')
          },
        },
        {
          label: 'Copy as @-mention (Claude Code)',
          value: 'copy-at',
          handler: async () => {
            if (!path) return
            await writeText(`@${path}`)
            toast.success('@-mention copied')
          },
        },
        {
          label: 'Copy as Markdown link',
          value: 'copy-md',
          handler: async () => {
            if (!path) return
            const name = path.split(/[\\/]/).pop() || path
            await writeText(`[${name}](${path})`)
            toast.success('Markdown link copied')
          },
        },
        {
          label: 'Reveal in Finder',
          value: 'reveal',
          handler: async () => {
            if (!path) return
            await revealItemInDir(path)
          },
        },
        {
          label: 'Open Terminal here',
          value: 'terminal',
          handler: async () => {
            if (!dir) return
            await openInOsTerminal(dir)
          },
        },
        {
          label: 'Open folder in Claude Code',
          value: 'claude',
          handler: async () => {
            if (!dir) return
            await openInOsTerminal(dir)
            await writeText(`cd "${dir}" && claude`)
            toast.success('Terminal opened; command on clipboard')
          },
        },
        {
          label: 'Open folder in Codex',
          value: 'codex',
          handler: async () => {
            if (!dir) return
            await openInOsTerminal(dir)
            await writeText(`cd "${dir}" && codex`)
            toast.success('Terminal opened; command on clipboard')
          },
        },
        {
          label: 'Copy "Improve this file" prompt',
          value: 'prompt-improve',
          handler: async () => {
            if (!path) return
            await writeText(
              `Read @${path} and propose 5 specific improvements. Format: file:line — issue — fix.`,
            )
            toast.success('Prompt copied')
          },
        },
      ],
    })
  }, [curFile])

  if (!curFile) return null

  return (
    <MfIconLabelButton
      size='small'
      rounded='smooth'
      iconRef={ref}
      icon={'ri-sparkling-2-line'}
      onClick={handleClick}
      tooltipProps={{ title: 'Smart Actions — copy path, reveal, Claude/Codex' }}
      label={'Smart'}
    />
  )
}
