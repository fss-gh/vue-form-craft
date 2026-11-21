import { AntdvNextAdapter, ElementPlusAdapter, VeanUIAdapter } from 'vue-form-craft/dev'

export type uiConfig = 'el' | 'antdvNext' | 'vean'

export const uiConfig = {
  el: { text: 'Element Plus', adapter: ElementPlusAdapter },
  antdvNext: { text: 'Antdv Next', adapter: AntdvNextAdapter },
  vean: { text: 'Vean UI', adapter: VeanUIAdapter }
}
