import styled from 'styled-components'
import { FileType } from '@/helper/fileTypeHandler'
import { ImagePreview } from './ImagePreview'
import { PdfPreview } from './PdfPreview'
import { RtfPreview } from './RtfPreview'

const PreviewContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  width: 100%;
  height: 100%;
`

interface PreviewContentProps {
  type: FileType
  filePath?: string
  active: boolean
}

export function PreviewContent({ type, filePath, active }: PreviewContentProps) {
  if (!active) return null

  const renderContent = () => {
    switch (type) {
      case 'image':
        return <ImagePreview filePath={filePath} />
      case 'pdf':
        return <PdfPreview filePath={filePath} />
      case 'rtf':
        return <RtfPreview filePath={filePath} />
      default:
        return null
    }
  }

  return <PreviewContainer>{renderContent()}</PreviewContainer>
}
