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
    // Tauri 2 bundles assets statically; modern target = smaller transforms.
    target: 'esnext',
    cssCodeSplit: true,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (/[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/.test(id)) {
            return 'vendor-react'
          }

          if (/[\\/]node_modules[\\/]lodash[\\/]/.test(id)) {
            return 'vendor-lodash'
          }

          if (/[\\/]node_modules[\\/](@tauri-apps)[\\/]/.test(id)) {
            return 'vendor-tauri'
          }
        },
      },
    },
  },
  esbuild: {
    legalComments: 'none',
    drop: ['debugger'],
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
