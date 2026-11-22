import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils'
import { Select as AntSelect } from 'antdv-next'
import { ElSelect } from 'element-plus'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { FormRender } from '@/components'
import { $uiAdapter } from '@/symbol'
import type { FormSchema } from '@/types'
import type { UIAdapter } from '@/types/uiAdapter'
import AntdvNextAdapter from '@/uiAdapter/AntdvNextAdapter'
import { wait } from '@/utils'

enableAutoUnmount(afterEach)

const options = [
  { label: '华东', value: 'east' },
  { label: '华南', value: 'south' }
]

const createSchema = (
  componentProps: Record<string, any> = {},
  initialValues?: Record<string, any>
): FormSchema => ({
  initialValues,
  labelWidth: 120,
  labelAlign: 'left',
  submitBtn: false,
  items: [
    {
      label: '地区',
      name: 'region',
      component: 'Select',
      componentProps: {
        options,
        ...componentProps
      }
    }
  ]
})

const mountForm = (
  schema: FormSchema,
  options?: { ui?: UIAdapter; read?: boolean }
): VueWrapper =>
  mount(FormRender, {
    attachTo: document.body,
    props: {
      schema,
      read: options?.read
    },
    global: options?.ui
      ? {
          provide: {
            [$uiAdapter]: options.ui
          }
        }
      : {}
  })

describe('Select 搜索与标签模式', () => {
  it('Element Plus 关闭搜索时过滤和创建选项均关闭', async () => {
    const wrapper = mountForm(
      createSchema({
        filterable: false
      })
    )

    await nextTick()
    await wait(50)

    const select = wrapper.findComponent(ElSelect)

    expect(select.props('filterable')).toBe(false)
    expect(select.props('allowCreate')).toBe(false)
  })

  it('Element Plus 标签模式自动开启多选、搜索和自定义选项', async () => {
    const wrapper = mountForm(
      createSchema({
        filterable: false,
        tags: true
      })
    )

    await nextTick()
    await wait(50)

    const select = wrapper.findComponent(ElSelect)

    expect(select.props('multiple')).toBe(true)
    expect(select.props('filterable')).toBe(true)
    expect(select.props('allowCreate')).toBe(true)
  })

  it('Antdv Next 标签模式映射为 tags 模式并开启搜索', async () => {
    const wrapper = mountForm(
      createSchema({
        filterable: false,
        tags: true
      }),
      { ui: AntdvNextAdapter }
    )

    await nextTick()
    await wait(50)

    const select = wrapper.findComponent(AntSelect)

    expect(select.props('mode')).toBe('tags')
    expect(select.props('showSearch')).toBe(true)
  })

  it('Antdv Next 关闭搜索时不展示搜索输入', async () => {
    const wrapper = mountForm(
      createSchema({
        filterable: false
      }),
      { ui: AntdvNextAdapter }
    )

    await nextTick()
    await wait(50)

    const select = wrapper.findComponent(AntSelect)

    expect(select.props('showSearch')).toBe(false)
    expect(select.props('mode')).toBeUndefined()
  })

  it('标签模式只读展示时保留自定义标签原文', async () => {
    const wrapper = mountForm(
      createSchema(
        {
          tags: true
        },
        {
          region: ['east', '自定义标签']
        }
      ),
      { read: true }
    )

    await nextTick()
    await wait(50)

    expect(wrapper.text()).toContain('华东、自定义标签')
  })
})
