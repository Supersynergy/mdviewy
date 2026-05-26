import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px 16px;
  text-align: center;
  color: ${(props) => props.theme.labelFontColor};

  .icon {
    font-size: 28px;
    line-height: 1;
    opacity: 0.45;
  }

  .title {
    font-size: 0.85rem;
    font-weight: 500;
    color: ${(props) => props.theme.primaryFontColor};
    opacity: 0.75;
  }

  .hint {
    font-size: 0.72rem;
    line-height: 1.4;
    max-width: 200px;
    opacity: 0.65;
  }
`

function Empty() {
  const { t } = useTranslation()

  return (
    <Container className='h-full w-full'>
      <i className='icon ri-folder-open-line' />
      <div className='title'>{t('explorer.emptyTitle')}</div>
      <div className='hint'>{t('explorer.emptyHint')}</div>
    </Container>
  )
}

export default memo(Empty)
