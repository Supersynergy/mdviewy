/// <reference types="vitest/config" />

import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    react({
      babel: {
        plugins: [
          ['@babel/plugin-proposal-decorators', { legacy: true }],
          ['@babel/plugin-proposal-class-properties', { loose: true }],
          'babel-plugin-react-compiler'
        ],
      },
    }),
    svgr({
      svgrOptions: {
        exportType: 'default',
      },
    }),
  ],
  build: {
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (/[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/.test(id)) {
            return 'vendor-react'
          }

          if (
            /[\\/]node_modules[\\/](@codemirror|@lezer|codemirror|prosemirror|rme)[\\/]/.test(id)
          ) {
            return 'vendor-editor'
          }

          if (/[\\/]node_modules[\\/](mermaid|cytoscape|dagre|khroma)[\\/]/.test(id)) {
            return 'vendor-diagrams'
          }

          if (/[\\/]node_modules[\\/](@tauri-apps)[\\/]/.test(id)) {
            return 'vendor-tauri'
          }

          if (
            /[\\/]node_modules[\\/](@ai-sdk|ai|ollama-ai-provider-v2)[\\/]/.test(id)
          ) {
            return 'vendor-ai'
          }

          if (
            /[\\/]node_modules[\\/](antd|zens|styled-components|@emotion|@ant-design)[\\/]/.test(id)
          ) {
            return 'vendor-ui'
          }

          return 'vendor'
        },
      },
    },
  },
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      { find: '@mdviewy/runtime-api', replacement: fileURLToPath(new URL('../../packages/runtime-api/src/index.ts', import.meta.url)) },
      { find: '@mdviewy/theme', replacement: fileURLToPath(new URL('../../packages/theme/src/index.ts', import.meta.url)) },
      { find: '@mdviewy/types', replacement: fileURLToPath(new URL('../../packages/types/index.ts', import.meta.url)) },
    ],
  },
  test: {
    environment: 'happy-dom',
    reporters: ['verbose'],
  },
})
