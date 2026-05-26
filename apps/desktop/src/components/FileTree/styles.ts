import styled from 'styled-components'

type NodeContainerProps = {
  highlight: boolean
  selected: boolean
}

export const NodeContainer = styled.div<NodeContainerProps>`
  font-size: ${(props) => props.theme.fontSm};
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  cursor: default;
  height: 100%;
  padding: 2px 6px;
  border-radius: 6px;
  color: ${(props) =>
    props.highlight || props.selected
      ? props.theme.primaryFontColor
      : props.theme.unselectedFontColor};
  background-color: ${(props) =>
    props.highlight
      ? props.theme.accentColorFocused
      : props.selected
        ? props.theme.fileTreeSelectedBgColor
        : 'transparent'};
  border: 1px solid ${(props) => (props.selected ? props.theme.borderColorFocused : 'transparent')};
  box-sizing: border-box;
  transition: background-color 140ms ease, color 140ms ease, transform 140ms ease;

  &:hover {
    background-color: ${(props) => props.theme.fileTreeSelectedBgColor};
    color: ${(props) => props.theme.primaryFontColor};
    transform: translateX(1px);
  }

  .file-icon {
    flex-shrink: 0;
    margin-right: 6px;
    opacity: 0.85;
  }
`
