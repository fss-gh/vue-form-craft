import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { FormRender } from '@/components'
import { $uiAdapter } from '@/symbol'
import type { FormSchema } from '@/types'
import AntdvNextAdapter from '@/uiAdapter/AntdvNextAdapter'

const mountWithAntdv = (schema: FormSchema) =>
  mount(FormRender, {
    props: { schema },
    global: {
      provide: {
        [$uiAdapter]: AntdvNextAdapter
      }
    }
  })

const createSchema = (labelAlign: FormSchema['labelAlign']): FormSchema => ({
  labelAlign,
  labelWidth: 120,
  items: [
    {
      label: '选项卡1',
      name: 'name1',
      component: 'Input'
    }
  ]
})

describe('Antdv Next 表单标签布局', () => {
  it('labelAlign 为 top 时表单项应继承垂直布局', async () => {
    const wrapper = mountWithAntdv(createSchema('top'))

    await nextTick()

    expect(wrapper.find('form').classes()).toContain('ant-form-vertical')

    const formItem = wrapper.find('.ant-form-item')

    expect(formItem.classes()).toContain('ant-form-item-vertical')
    expect(formItem.classes()).not.toContain('ant-form-item-horizontal')
  })

  it('labelAlign 为 left 时表单项应保持水平布局', async () => {
    const wrapper = mountWithAntdv(createSchema('left'))

    await nextTick()

    expect(wrapper.find('form').classes()).toContain('ant-form-horizontal')

    const formItem = wrapper.find('.ant-form-item')

    expect(formItem.classes()).toContain('ant-form-item-horizontal')
    expect(formItem.classes()).not.toContain('ant-form-item-vertical')
  })
})
