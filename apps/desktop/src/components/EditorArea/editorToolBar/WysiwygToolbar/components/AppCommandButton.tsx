import { MfIconButton } from '@/components/ui-v2/Button'
import { useCommandStore } from '@/stores'
import { FC, useCallback } from 'react'

export interface AppCommandButtonProps {
  /** Command id registered in the command store, e.g. `app_findReplaceEditor`. */
  commandId: string
  icon: string
  label: string
  /** Human-readable shortcut, appended to the tooltip. */
  shortcut?: string
  active?: boolean
}

/**
 * Toolbar button for application commands (layout, search, files) as opposed to
 * `CommandButton`, which drives editor commands on the active document.
 */
export const AppCommandButton: FC<AppCommandButtonProps> = ({
  commandId,
  icon,
  label,
  shortcut,
  active,
}) => {
  const { execute } = useCommandStore()

  const handleClick = useCallback(() => {
    execute(commandId)
  }, [execute, commandId])

  return (
    <MfIconButton
      icon={icon}
      onClick={handleClick}
      active={active}
      ariaLabel={label}
      tooltipProps={{ title: shortcut ? `${label} (${shortcut})` : label }}
      size='small'
      rounded='smooth'
    />
  )
}
