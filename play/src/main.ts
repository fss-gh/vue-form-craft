import { SConfigProvider } from '@vean/ui'
import ElementPlus from 'element-plus'
import { createApp, defineComponent, h } from 'vue'
import VueFormCraft from 'vue-form-craft/dev'
import App from './App.vue'
import router from './router'
import { ai } from './utils/ai'
import 'element-plus/dist/index.css'
import '@vean/ui/styles.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { uiConfig } from './uiConfig'
// if you just want to import css
import 'element-plus/theme-chalk/dark/css-vars.css'

// document.documentElement.classList.add('dark')

const uiParam = new URLSearchParams(window.location.search).get('ui')
const ui = (uiParam && uiParam in uiConfig ? uiParam : 'el') as keyof typeof uiConfig

const Root =
  ui === 'vean'
    ? defineComponent({
        name: 'VeanRoot',
        setup() {
          return () => h(SConfigProvider, null, { default: () => h(App) })
        }
      })
    : App

const app = createApp(Root)

app.use(router)

app.use(VueFormCraft, {
  ai,
  ui: uiConfig[ui].adapter
})

app.use(ElementPlus, {
  locale: zhCn
})

app.mount('#app')
