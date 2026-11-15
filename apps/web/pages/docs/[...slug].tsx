import Loading from 'components/Loading'
import Markdown from 'markdown-to-jsx'
import { docs, readDocument } from 'utils/sections'
import { GetStaticPaths, GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import dynamic from 'next/dynamic'
import DocsLayout from '../../components/DocsLayout'
import RmeProvider from '../../components/RmeProvider'

const DynamicMdHtmlWrapper = dynamic(() => import('../../components/MdHtmlWrapper'), {
  ssr: false,
  loading: () => <Loading />,
})

function PostLayout({ source }: { source: string }) {
  return (
    <DocsLayout>
      <RmeProvider themeTokens={{ bgColor: '#14120B' }}>
        <DynamicMdHtmlWrapper><Markdown>{source}</Markdown></DynamicMdHtmlWrapper>
      </RmeProvider>
    </DocsLayout>
  )
}

export default PostLayout

export const getStaticPaths: GetStaticPaths = async ({ locales = [] }) => {
  const paths = docs.filter(doc => locales.includes(doc.locale)).map(doc => ({
    params: { slug: doc.slug.slice(1).split('/') }, locale: doc.locale,
  }))
  return {
    paths,
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps = async ({ locale, params }) => {
  const slug = Array.isArray(params?.slug) ? '/' + params.slug.join('/') : ''
  const doc = docs.find(entry => entry.locale === locale && entry.slug === slug)
  if (!doc) return { notFound: true }
  return {
    props: {
      source: readDocument(doc),
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  }
}
