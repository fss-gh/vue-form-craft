import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import * as ts from 'typescript'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import libCss from 'vite-plugin-libcss'
import { registerTS } from 'vue/compiler-sfc'

// Vite 8 no longer registers TypeScript with @vue/compiler-sfc automatically.
// It is required to resolve imported prop types and tsconfig path aliases.
registerTS(() => ts)

export default defineConfig({
  plugins: [
    vue(),
    dts({
      outDirs: './dist',
      pathsToAliases: true,
      bundleTypes: true,
      processor: 'vue'
    }),
    libCss()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL('src/index.ts', import.meta.url)), //指定组件编译入口文件
      name: 'VueFormCraft', // umd全局变量名
      fileName: 'index' // 打包文件名
    },
    rolldownOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external: ['vue', 'element-plus', 'antdv-next', '@vean/ui', 'vee-validate'],
      output: {
        // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
        globals: {
          vue: 'Vue',
          'element-plus': 'ElementPlus',
          'antdv-next': 'antd',
          '@vean/ui': 'VeanUI',
          'vee-validate': 'VeeValidate'
        },
        exports: 'named',
        chunkFileNames: 'lazy/[name]-[hash].js'
      }
    }
  }
})
