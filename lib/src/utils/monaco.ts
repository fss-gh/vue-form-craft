import { loader } from '@guolao/vue-monaco-editor'

let setupPromise: Promise<void> | null = null

/**
 * 使用本地 monaco-editor 和 worker，避免从 CDN 加载。
 * 首次调用时会异步加载 Monaco，后续调用复用同一个 Promise。
 */
export const setupMonaco = () => {
  if (typeof window === 'undefined') return Promise.resolve()
  if (setupPromise) return setupPromise

  setupPromise = (async () => {
    const [monaco, editorWorker, cssWorker, htmlWorker, jsonWorker, tsWorker] = await Promise.all([
      import('monaco-editor'),
      import('monaco-editor/editor/editor.worker?worker'),
      import('monaco-editor/language/css/css.worker?worker'),
      import('monaco-editor/language/html/html.worker?worker'),
      import('monaco-editor/language/json/json.worker?worker'),
      import('monaco-editor/language/typescript/ts.worker?worker')
    ])

    const monacoGlobal = globalThis as typeof globalThis & {
      MonacoEnvironment?: {
        getWorker: (_workerId: string, label: string) => Worker
      }
    }

    monacoGlobal.MonacoEnvironment = {
      getWorker(_workerId: string, label: string) {
        if (label === 'json') return new jsonWorker.default()
        if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker.default()
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
          return new htmlWorker.default()
        }
        if (label === 'typescript' || label === 'javascript') return new tsWorker.default()
        return new editorWorker.default()
      }
    }

    loader.config({ monaco })

    // 兼容仍通过 window.monaco 获取实例的旧代码
    ;(window as any).monaco = monaco
  })().catch((error) => {
    setupPromise = null
    throw error
  })

  return setupPromise
}
