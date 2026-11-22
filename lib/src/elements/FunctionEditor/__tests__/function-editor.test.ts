import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { $uiAdapter } from '@/symbol'
import type { UIAdapter } from '@/types/uiAdapter'
import AntdvNextAdapter from '@/uiAdapter/AntdvNextAdapter'
import { wait } from '@/utils'
import FunctionEditor from '../FunctionEditor.vue'

enableAutoUnmount(afterEach)

const mountFunctionEditor = (ui?: UIAdapter) =>
  mount(FunctionEditor, {
    attachTo: document.body,
    props: {
      formItemProps: {
        name: 'fn',
        label: '函数',
        component: 'FunctionEditor'
      } as any,
      modelValue: '{{ return 1 }}'
    },
    global: ui
      ? {
          provide: {
            [$uiAdapter]: ui
          }
        }
      : {}
  })

const openEditor = async (wrapper: ReturnType<typeof mountFunctionEditor>) => {
  const editButton = wrapper
    .findAll('button')
    .find((button) => button.text().includes('编辑函数'))

  expect(editButton).toBeDefined()

  await editButton!.trigger('click')
  await nextTick()
  await wait(200)
}

it('Antdv Next 下不会出现 destroyOnClose 废弃警告', async () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  try {
    const wrapper = mountFunctionEditor(AntdvNextAdapter)

    await openEditor(wrapper)

    const messages = [...warnSpy.mock.calls, ...errorSpy.mock.calls]
      .map((args) => args.join(' '))
      .join('\n')

    expect(messages).not.toContain('destroyOnClose')
  } finally {
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  }
})

describe.each([
  ['Element Plus', undefined],
  ['Antdv Next', AntdvNextAdapter]
])('%s 函数编辑器', (_, ui) => {
  it('.monaco-editor-wrapper 位于函数编辑器根节点内，scoped 样式可命中', async () => {
    const wrapper = mountFunctionEditor(ui)

    await openEditor(wrapper)

    const root = wrapper.element as HTMLElement
    const monacoWrapper = root.querySelector('.monaco-editor-wrapper')

    expect(monacoWrapper).not.toBeNull()
    expect(monacoWrapper!.closest('.vfc-function-editor')).toBe(root)

    const scopeAttribute = Array.from(root.attributes).find(({ name }) =>
      name.startsWith('data-v-')
    )?.name

    expect(scopeAttribute).toBeDefined()
    expect(monacoWrapper!.hasAttribute(scopeAttribute!)).toBe(true)
  })
})
