import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import * as ts from 'typescript'
import { defineConfig } from 'vite'
import { registerTS } from 'vue/compiler-sfc'

// Vite 8 no longer registers TypeScript with @vue/compiler-sfc automatically.
registerTS(() => ts)

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../lib/src', import.meta.url)),
      '~': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0'
  }
})
