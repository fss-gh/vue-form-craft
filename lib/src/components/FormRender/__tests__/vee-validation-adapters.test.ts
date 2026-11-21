import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { FormRender } from '@/components'
import { $uiAdapter } from '@/symbol'
import type { FormSchema } from '@/types'
import type { UIAdapter } from '@/types/uiAdapter'
import AntdvNextAdapter from '@/uiAdapter/AntdvNextAdapter'
import VeanUIAdapter from '@/uiAdapter/VeanUIAdapter'

const schema: FormSchema = {
  validationEngine: 'vee-validate',
  labelWidth: 120,
  labelAlign: 'right',
  scrollToError: false,
  submitBtn: false,
  items: [
    {
      label: '用户名',
      name: 'username',
      component: 'Input',
      required: true,
      rules: [{ type: 'min', value: 3, message: '至少 3 位', trigger: 'blur' }]
    }
  ]
}

const mountWithAdapter = (adapter: UIAdapter, modelValue: Record<string, any> = {}) =>
  mount(FormRender, {
    props: { schema, modelValue },
    global: {
      provide: {
        [$uiAdapter]: adapter
      }
    }
  })

describe.each([
  ['Antdv Next', AntdvNextAdapter],
  ['Vean UI', VeanUIAdapter]
])('%s + VeeValidate', (_name, adapter) => {
  it('blur 校验错误可以显示并在修正后清除', async () => {
    const wrapper = mountWithAdapter(adapter, { username: 'ab' })
    await nextTick()

    await wrapper.find('.Input-username input').trigger('focusout')
    await flushPromises()

    expect(wrapper.text()).toContain('至少 3 位')

    await wrapper.find('.Input-username input').setValue('abcd')
    await wrapper.find('.Input-username input').trigger('focusout')
    await flushPromises()

    expect(wrapper.text()).not.toContain('至少 3 位')
  })
})
