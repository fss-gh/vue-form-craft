import type { FormElement } from '@/types'
import attrSchema from './attrSchema'
import Latex from './Latex.vue'

export default {
  title: 'LaTeX 公式',
  component: 'Latex',
  render: Latex,
  icon: 'latex',
  type: 'high',
  order: 31,
  attrSchema
} satisfies FormElement
