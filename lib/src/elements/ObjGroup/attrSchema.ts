import type { FormSchema } from '@/types'
export default {
  labelWidth: 150,
  labelAlign: 'top',
  size: 'small',
  submitBtn: false,
  initialValues: {
    props: {
      align: 'left',
      gap: 20
    },
    componentProps: {
      unitLinkage: false
    },
    items: []
  },
  items: [
    {
      label: '唯一标识',
      component: 'Input',
      name: 'name'
    },
    {
      label: '单位联动',
      name: 'componentProps.unitLinkage',
      component: 'Switch',
      help: '开启后，容器内支持该单位的数字组件会同步切换单位'
    },
    {
      label: '初始数据',
      help: '设置对象容器内字段的默认值，已有表单初始值不会被覆盖',
      name: 'componentProps.initialData',
      component: 'FunctionEditor'
    }
  ]
} satisfies FormSchema
