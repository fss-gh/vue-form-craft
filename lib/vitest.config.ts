import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import * as ts from 'typescript'
import { defineConfig } from 'vitest/config'
import { registerTS } from 'vue/compiler-sfc'

registerTS(() => ts)

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      reporter: ['text', 'json', 'html']
    },
    setupFiles: path.resolve(import.meta.dirname, 'vitest.setup.ts'),
    css: false,
    server: {
      deps: {
        inline: [/vue-element-plus-x/]
      }
    }
  },
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src') // 子包自己的 src
    }
  }
})
