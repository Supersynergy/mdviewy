import classNames from 'classnames'
import styled from 'styled-components'
import type { TooltipProps } from 'zens'
import { Tooltip } from 'zens'

interface MfIconLabelButtonProps {
  icon: string
  label?: string
  className?: string
  onClick: (e?: React.MouseEvent<HTMLElement>) => void
  iconRef?: React.RefObject<any>
  ariaLabel?: string
  tooltipProps?: Omit<TooltipProps, 'children'> & {
    style?: React.CSSProperties
  }
  disabled?: boolean
  unselected?: boolean
  active?: boolean
  size?: 'small' | 'medium' | 'large'
  rounded?: 'smooth' | 'rounded' | 'square'
}

const Wrapper = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 0;
  border-radius: ${(props) => props.theme.smallBorderRadius};
  background: transparent;
  color: inherit;
  font-size: ${(props) => props.theme.fontXs};
  font-family: inherit;
  gap: 4px;
  cursor: pointer;


  &:hover {
    color: ${(props) => props.theme.accentColor};
    background-color: ${(props) => props.theme.hoverColor};
  }

  .btn-icon {
    font-size: 1rem;
  }
`
export const MfIconLabelButton = (props: MfIconLabelButtonProps) => {
  const {
    label,
    onClick,
    tooltipProps,
    iconRef,
    disabled = false,
    icon,
    ariaLabel: explicitAriaLabel,
  } = props

  const ariaLabel =
    explicitAriaLabel ||
    label ||
    (typeof tooltipProps?.title === 'string' ? tooltipProps.title : undefined)
  const iconCls = classNames('btn-icon', icon)

  const content = (
    <Wrapper
      ref={iconRef}
      type='button'
      onClick={disabled ? undefined : onClick}
      aria-label={ariaLabel}
      disabled={disabled}
    >
      <i aria-hidden='true' className={iconCls}></i>
      {label && <span className='icon-label'>{label}</span>}
    </Wrapper>
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
