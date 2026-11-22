import type { FormElement } from '@/types'
import attrSchema from './attrSchema'
import ObjGroup from './ObjGroup.vue'
export default {
  title: '对象容器',
  icon: 'itemGroup',
  type: 'high',
  component: 'ObjGroup',
  render: ObjGroup,
  order: 2,
  attrSchema
} satisfies FormElement
