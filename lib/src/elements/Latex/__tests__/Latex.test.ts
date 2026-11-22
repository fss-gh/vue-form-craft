import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { FormRender } from '@/components'
import { $uiAdapter } from '@/symbol'
import type { FormSchema } from '@/types'
import type { UIAdapter } from '@/types/uiAdapter'
import AntdvNextAdapter from '@/uiAdapter/AntdvNextAdapter'
import { FormDesignTest, ns, wait } from '@/utils'

const createSchema = (componentProps: Record<string, any>): FormSchema => ({
  labelWidth: 100,
  labelAlign: 'right',
  items: [
    {
      label: '公式',
      name: 'formula',
      component: 'Latex',
      componentProps
    }
  ]
})

const mountLatex = (componentProps: Record<string, any>) =>
  mount(FormRender, {
    props: {
      schema: createSchema(componentProps)
    }
  })

const mountLatexWithAdapter = (adapter: UIAdapter, componentProps: Record<string, any>) =>
  mount(FormRender, {
    props: {
      schema: createSchema(componentProps)
    },
    global: {
      provide: {
        [$uiAdapter]: adapter
      }
    }
  })

describe('Latex 公式组件', () => {
  it('默认以只读方式渲染 KaTeX 公式', async () => {
    const wrapper = mountLatex({
      expression: '\\frac{a}{b}',
      displayMode: true
    })

    await nextTick()

    expect(wrapper.find('.vfc-latex').exists()).toBe(true)
    expect(wrapper.find('.vfc-latex-editor').exists()).toBe(false)
    expect(wrapper.find('.vfc-latex-edit-btn').exists()).toBe(false)
    expect(wrapper.find('.katex').exists()).toBe(true)
    expect(wrapper.find('.katex-display').exists()).toBe(true)
    expect(wrapper.html()).toContain('annotation')
  })

  it('可编辑模式默认隐藏输入框，点击编辑按钮后展示并实时预览', async () => {
    const wrapper = mountLatex({
      expression: '\\frac{a}{b}',
      editable: true
    })

    await nextTick()

    expect(wrapper.find('.vfc-latex-editor').exists()).toBe(false)
    expect(wrapper.find('textarea').exists()).toBe(false)

    const editBtn = wrapper.find('.vfc-latex-edit-btn')
    expect(editBtn.exists()).toBe(true)

    await editBtn.trigger('click')
    await nextTick()

    expect(wrapper.find('.vfc-latex-editor').exists()).toBe(true)
    expect(wrapper.find('.vfc-latex-template-btn').exists()).toBe(false)

    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    expect((textarea.element as HTMLTextAreaElement).value).toBe('\\frac{a}{b}')

    await textarea.setValue('x^2 + y^2')
    await nextTick()

    expect(wrapper.find('.vfc-latex-content').html()).toContain('x^2 + y^2')

    await wrapper.find('.vfc-latex-confirm-btn').trigger('click')
    await nextTick()

    expect(wrapper.find('.vfc-latex-editor').exists()).toBe(false)
    expect(wrapper.find('.vfc-latex-edit-btn').exists()).toBe(true)
    expect(wrapper.find('.vfc-latex-content').html()).toContain('x^2 + y^2')
  })

  it('编辑时可通过输入框后缀按钮打开模板弹层并选择模板', async () => {
    const wrapper = mountLatex({
      expression: '\\frac{a}{b}',
      editable: true,
      templates: [
        { label: '分式', expression: '\\frac{x}{y}' },
        { label: '根式', expression: '\\sqrt{x}' }
      ]
    })

    await nextTick()
    await wrapper.find('.vfc-latex-edit-btn').trigger('click')
    await nextTick()

    expect(wrapper.find('.vfc-latex-template-select').exists()).toBe(false)

    const trigger = wrapper.find('.vfc-latex-template-btn')
    expect(trigger.exists()).toBe(true)
    expect(trigger.find('.vfc-latex-template-icon').exists()).toBe(true)

    await trigger.trigger('click')
    await wait(100)

    const items = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('.vfc-latex-template-item')
    )

    expect(items).toHaveLength(2)
    expect(items[0]?.textContent).toContain('分式')
    expect(items[0]?.querySelector('.katex')).not.toBeNull()
    expect(items[1]?.textContent).toContain('根式')
    expect(items[1]?.querySelector('.katex')).not.toBeNull()

    const textarea = wrapper.find('textarea')

    items[1]!.click()
    await wait(100)

    expect((textarea.element as HTMLTextAreaElement).value).toBe('\\sqrt{x}')
    expect(wrapper.find('.vfc-latex-content').html()).toContain('sqrt{x}')

    await wrapper.find('.vfc-latex-confirm-btn').trigger('click')
    await nextTick()

    expect(wrapper.find('.vfc-latex-editor').exists()).toBe(false)
    expect(wrapper.find('.vfc-latex-content').html()).toContain('sqrt{x}')

    wrapper.unmount()
  })

  it('取消编辑不会修改公式', async () => {
    const wrapper = mountLatex({
      expression: '\\frac{a}{b}',
      editable: true
    })

    await nextTick()
    await wrapper.find('.vfc-latex-edit-btn').trigger('click')
    await nextTick()

    await wrapper.find('textarea').setValue('z')
    await wrapper.find('.vfc-latex-cancel-btn').trigger('click')
    await nextTick()

    expect(wrapper.find('.vfc-latex-editor').exists()).toBe(false)

    await wrapper.find('.vfc-latex-edit-btn').trigger('click')
    await nextTick()

    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('\\frac{a}{b}')
  })

  it('公式解析失败时展示错误信息', async () => {
    const wrapper = mountLatex({
      expression: '\\frac{a'
    })

    await nextTick()

    expect(wrapper.find('.vfc-latex-error').exists()).toBe(true)
    expect(wrapper.find('.vfc-latex-error').text()).toContain('KaTeX parse error')
  })

  it('支持模板表达式返回非字符串公式', async () => {
    const wrapper = mount(FormRender, {
      props: {
        schema: createSchema({
          expression: '{{ $values.a }}'
        }),
        modelValue: {
          a: 2
        }
      }
    })

    await nextTick()

    expect(wrapper.find('.vfc-latex').exists()).toBe(true)
    expect(wrapper.find('.katex').exists()).toBe(true)
  })
})

describe('Antdv Next 下的 Latex 组件', () => {
  it('点击编辑按钮后可输入公式并确认', async () => {
    const wrapper = mountLatexWithAdapter(AntdvNextAdapter, {
      expression: '\\frac{a}{b}',
      editable: true
    })

    await nextTick()

    expect(wrapper.find('textarea').exists()).toBe(false)

    await wrapper.find('.vfc-latex-edit-btn').trigger('click')
    await nextTick()

    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)

    await textarea.setValue('\\sqrt{2}')
    await nextTick()

    expect(wrapper.find('.vfc-latex-content').html()).toContain('sqrt{2}')

    await wrapper.find('.vfc-latex-confirm-btn').trigger('click')
    await nextTick()

    expect(wrapper.find('.vfc-latex-editor').exists()).toBe(false)
    expect(wrapper.find('.vfc-latex-content').html()).toContain('sqrt{2}')
  })

  it('可通过后缀按钮打开模板弹层并选择模板', async () => {
    const wrapper = mountLatexWithAdapter(AntdvNextAdapter, {
      expression: '\\frac{a}{b}',
      editable: true,
      templates: [{ label: '根式', expression: '\\sqrt{x}' }]
    })

    await nextTick()
    await wrapper.find('.vfc-latex-edit-btn').trigger('click')
    await nextTick()

    const trigger = wrapper.find('.vfc-latex-template-btn')
    expect(trigger.exists()).toBe(true)

    await trigger.trigger('click')
    await wait(150)

    const items = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('.vfc-latex-template-item')
    )

    expect(items).toHaveLength(1)
    expect(items[0]?.textContent).toContain('根式')
    expect(items[0]?.querySelector('.katex')).not.toBeNull()

    items[0]!.click()
    await wait(150)

    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('\\sqrt{x}')
    expect(wrapper.find('.vfc-latex-content').html()).toContain('sqrt{x}')

    wrapper.unmount()
  })
})

describe('Latex 设计器集成', () => {
  it('可从高级组件菜单添加并渲染默认公式', async () => {
    const { items, dblclickAdd, centerWrapper } = FormDesignTest()

    await dblclickAdd('Latex')

    expect(items.value?.[0]).toMatchObject({
      component: 'Latex',
      label: 'LaTeX 公式',
      componentProps: {
        expression: '\\frac{a}{b}',
        displayMode: true
      }
    })

    expect(centerWrapper.find('.vfc-latex').exists()).toBe(true)
    expect(centerWrapper.find('.katex-display').exists()).toBe(true)
  })

  it('属性面板可新增公式模板', async () => {
    const { items, dblclickAdd, clickItem, rightWrapper } = FormDesignTest()

    await dblclickAdd('Latex')
    await clickItem()

    const formList = rightWrapper.find(`.${ns('formList')}`)
    expect(formList.exists()).toBe(true)

    const addBtn = formList.find('.list-btn.addBtn')
    expect(addBtn.exists()).toBe(true)

    await addBtn.trigger('click')
    await wait(300)

    expect(items.value?.[0].componentProps?.templates).toHaveLength(1)
    expect(items.value?.[0].componentProps?.templates?.[0]).toMatchObject({
      label: '新模板',
      expression: '\\frac{a}{b}'
    })
  })
})
