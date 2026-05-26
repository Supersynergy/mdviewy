import { TaskList } from '../TaskList/TaskList'
import { EditorCount } from './EditorCount'
import { EditorModeBtn } from './EditorModeBtn'
import { LayoutLeftBtn, LayoutRightBtn } from './LayoutBtn'
import { CenterMenu } from './SettingBtn'
import { PaletteBtn } from './PaletteBtn'
import { Container, LeftContainer, RightContainer } from './styled'
import { WorkspaceBtn } from './WorkspaceBtn'

export default function StatusBar() {
  return (
    <Container>
      <LeftContainer>
        <CenterMenu />
        <WorkspaceBtn />
        <PaletteBtn />
      </LeftContainer>
      <RightContainer>
        <TaskList />
        <EditorModeBtn />
        <EditorCount />
        <LayoutLeftBtn />
        <LayoutRightBtn />
      </RightContainer>
    </Container>
  )
}
