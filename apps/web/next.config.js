const { i18n } = require('./next-i18next.config.js')
const path = require('path')

/**
 * @type {import('next').NextConfig}
 */

module.exports = {
  compiler: {
    styledComponents: true,
    styledJsx: true
  },
  i18n: { ...i18n, },
  output: 'standalone',
  turbopack: {
    root: path.resolve(__dirname, '../..'),
    rules: { '*.md': { type: 'text' } },
  },
}
