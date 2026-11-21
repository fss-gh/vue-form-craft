import { config } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { vi } from 'vitest'
import * as elements from '@/elements'
import { $globals } from '@/symbol'

// Monaco 本地初始化只用于浏览器，测试中不需要加载 monaco-editor
vi.mock('@/utils/monaco', () => ({
  setupMonaco: vi.fn()
}))

// Mock Monaco Editor - vi.mock 会被提升，所以需要在内部定义
vi.mock('@guolao/vue-monaco-editor', () => {
  const MockMonacoEditor = {
    name: 'MonacoEditor',
    template: '<div class="monaco-editor-mock"></div>',
    props: ['modelValue', 'language', 'theme', 'options'],
    emits: ['update:modelValue']
  }

  return {
    default: MockMonacoEditor,
    VueMonacoEditor: MockMonacoEditor,
    useMonaco: () => ({
      monacoRef: { value: null },
      unload: () => {},
      isLoadFailed: { value: false }
    }),
    loader: {
      config: vi.fn(),
      __getMonacoInstance: () => null
    }
  }
})

config.global.plugins = [ElementPlus]
config.global.provide = {
  [$globals]: {
    lang: 'zh',
    elements
  }
}

// antdv-next 会读取 matchMedia；jsdom 未实现，测试环境需要补一个最小实现
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    }) as MediaQueryList
}
