// Next bundles the localized documents and tracks additions during development.
export const documentFiles = require.context('../../../docs', true, /^\.\/(en|zh)\/.+\.md$/)
