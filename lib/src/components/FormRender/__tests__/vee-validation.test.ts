import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { FormRender } from '@/components'
import type { FormSchema } from '@/types'
import { wait } from '@/utils'

const baseSchema: FormSchema = {
  validationEngine: 'vee-validate',
  labelWidth: 120,
  labelAlign: 'right',
  scrollToError: false,
  submitBtn: true,
  items: [
    {
      label: '用户名',
      name: 'username',
      component: 'Input',
      required: true,
      componentProps: {
        placeholder: '请输入用户名'
      }
    }
  ]
}

const mountForm = (schema: FormSchema, modelValue: Record<string, any> = {}) =>
  mount(FormRender, {
    props: {
      schema,
      modelValue
    }
  })

let wrapper: ReturnType<typeof mount>

describe('VeeValidate 校验引擎', () => {
  it('提交校验失败时抛出字段错误，并在 UI 中显示', async () => {
    const schema: FormSchema = {
      ...baseSchema,
      items: [
        {
          ...baseSchema.items![0],
          rules: [{ type: 'required', message: '用户名必填', trigger: 'blur' }]
        }
      ]
    }

    wrapper = mountForm(schema)
    await nextTick()

    await expect((wrapper.vm as any).validate()).rejects.toMatchObject({
      username: '用户名必填'
    })
    await nextTick()
    await wait(150)

    expect(wrapper.text()).toContain('用户名必填')
  })

  it('blur 触发的规则在 focusout 后显示错误，输入合法值后清除', async () => {
    const schema: FormSchema = {
      ...baseSchema,
      items: [
        {
          ...baseSchema.items![0],
          rules: [{ type: 'min', value: 3, message: '至少 3 位', trigger: 'blur' }]
        }
      ]
    }

    wrapper = mountForm(schema, { username: 'ab' })
    await nextTick()

    await wrapper.find('.Input-username input').trigger('focusout')
    await flushPromises()
    await wait(150)

    expect(wrapper.text()).toContain('至少 3 位')

    await wrapper.find('.Input-username input').setValue('abcd')
    await wrapper.find('.Input-username input').trigger('focusout')
    await flushPromises()
    await wait(150)

    expect(wrapper.text()).not.toContain('至少 3 位')
  })

  it('change 触发的规则在输入变化时立即校验', async () => {
    const schema: FormSchema = {
      ...baseSchema,
      items: [
        {
          ...baseSchema.items![0],
          rules: [{ type: 'min', value: 3, message: '至少 3 位', trigger: 'change' }]
        }
      ]
    }

    wrapper = mountForm(schema)
    await nextTick()

    await wrapper.find('.Input-username input').setValue('ab')
    await flushPromises()
    await wait(150)

    expect(wrapper.text()).toContain('至少 3 位')

    await wrapper.find('.Input-username input').setValue('abcd')
    await flushPromises()
    await wait(150)

    expect(wrapper.text()).not.toContain('至少 3 位')
  })

  it('支持异步自定义校验', async () => {
    const schema: FormSchema = {
      ...baseSchema,
      items: [
        {
          ...baseSchema.items![0],
          rules: [
            {
              type: 'custom',
              message: '用户名已被占用',
              trigger: 'blur',
              value: (_rule: any, value: string, callback: (error?: Error) => void) => {
                setTimeout(() => {
                  callback(value === 'admin' ? new Error('用户名已被占用') : undefined)
                }, 5)
              }
            }
          ]
        }
      ]
    }

    wrapper = mountForm(schema, { username: 'admin' })
    await nextTick()

    await wrapper.find('.Input-username input').trigger('focusout')
    await flushPromises()
    await wait(150)

    expect(wrapper.text()).toContain('用户名已被占用')
  })

  it('resetFields 会恢复初始值并清空校验状态', async () => {
    const schema: FormSchema = {
      ...baseSchema,
      initialValues: { username: 'init' },
      resetBtn: true,
      items: [
        {
          ...baseSchema.items![0],
          rules: [{ type: 'required', message: '用户名必填', trigger: 'blur' }]
        }
      ]
    }

    wrapper = mountForm(schema)
    await nextTick()

    await wrapper.find('.Input-username input').setValue('')
    await expect((wrapper.vm as any).validate()).rejects.toBeTruthy()
    await nextTick()
    await wait(150)
    expect(wrapper.text()).toContain('用户名必填')

    ;(wrapper.vm as any).resetFields()
    await nextTick()
    await flushPromises()
    await wait(150)

    expect((wrapper.find('.Input-username input').element as HTMLInputElement).value).toBe('init')
    expect(wrapper.text()).not.toContain('用户名必填')
  })

  it('submit 在校验通过时触发 finish', async () => {
    wrapper = mountForm(baseSchema, { username: 'huyilin' })
    await nextTick()

    ;(wrapper.vm as any).submit()
    await flushPromises()

    expect(wrapper.emitted('finish')).toHaveLength(1)
    expect(wrapper.emitted('failed')).toBeUndefined()
  })

  it('FormList 动态字段路径可以被校验', async () => {
    const schema: FormSchema = {
      validationEngine: 'vee-validate',
      scrollToError: false,
      submitBtn: false,
      items: [
        {
          label: '用户列表',
          name: 'users',
          component: 'FormList',
          componentProps: {
            mode: 'table'
          },
          items: [
            {
              label: '用户名',
              name: 'username',
              component: 'Input',
              required: true
            }
          ]
        }
      ]
    }

    wrapper = mountForm(schema, {})
    await nextTick()

    await wrapper.find('.FormList-users .addBtn').trigger('click')
    await flushPromises()

    await expect((wrapper.vm as any).validate()).rejects.toMatchObject({
      'users.0.username': '该字段是必填字段'
    })

    await wrapper.find('.Input-users\\.0\\.username input').setValue('huyilin')
    await wrapper.find('.Input-users\\.0\\.username input').trigger('focusout')
    await flushPromises()

    await expect((wrapper.vm as any).validate()).resolves.toBe(true)
  })
})
