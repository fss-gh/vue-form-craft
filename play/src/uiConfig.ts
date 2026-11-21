import { AntdvNextAdapter, ElementPlusAdapter } from 'vue-form-craft/dev'

export type uiConfig = 'elementPlus' | 'antdvNext'

export const uiConfig = {
  el: { text: 'Element Plus', adapter: ElementPlusAdapter },
  antdvNext: { text: 'Antdv Next', adapter: AntdvNextAdapter }
}
