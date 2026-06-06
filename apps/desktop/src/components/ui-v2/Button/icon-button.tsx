import classNames from 'classnames'
import type { TooltipProps } from 'zens'
import { Tooltip } from 'zens'

interface MfIconButtonProps {
  icon: string
  className?: string
  onClick: (e?: React.MouseEvent<HTMLElement>) => void
  iconRef?: React.RefObject<any>
  ariaLabel?: string
  active?: boolean
  tooltipProps?: Omit<TooltipProps, 'children'> & {
    style?: React.CSSProperties
  }
  disabled?: boolean
  unselected?: boolean
  size?: 'small' | 'medium' | 'large'
  rounded?: 'smooth' | 'rounded' | 'square'
}

export const MfIconButton = (props: MfIconButtonProps) => {
  const {
    icon,
    onClick,
    tooltipProps,
    iconRef,
    ariaLabel: explicitAriaLabel,
    rounded = 'square',
    disabled = false,
    unselected = false,
  } = props

  const ariaLabel =
    explicitAriaLabel || (typeof tooltipProps?.title === 'string' ? tooltipProps.title : undefined)

  const buttonCls = classNames('icon', props.className, {
    'icon--active': props.active,
    [`icon-${props.size || 'medium'}`]: true,
    'icon-rounded': rounded === 'rounded',
    'icon-smooth': rounded === 'smooth',
    'icon-square': rounded === 'square',
    'icon-unselected': unselected,
    'icon-disabled': disabled
  })

  const content = (
    <button
      ref={iconRef}
      type='button'
      className={buttonCls}
      onClick={disabled ? undefined : onClick}
      aria-label={ariaLabel}
      disabled={disabled}
    >
      <i aria-hidden='true' className={icon}></i>
    </button>
  )

  if (tooltipProps) {
    return (
      <Tooltip style={{ zIndex: 11 }} {...tooltipProps}>
        {content}
      </Tooltip>
    )
  }

  return content
}
