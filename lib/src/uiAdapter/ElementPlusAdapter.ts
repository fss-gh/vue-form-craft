import {
  ElAlert,
  ElButton,
  ElCard,
  ElCascader,
  ElCheckboxGroup,
  ElCollapse,
  ElCollapseItem,
  ElColorPicker,
  ElDatePicker,
  ElDialog,
  ElDivider,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPopover,
  ElRadioGroup,
  ElRate,
  ElSelect,
  ElSlider,
  ElSwitch,
  ElTabPane,
  ElTabs,
  ElTag,
  ElTooltip,
  type FormInstance
} from 'element-plus'
import { omit } from 'lodash'
import { defineComponent, h, ref } from 'vue'
import { Icon } from '@/components'
import type {
  AlertProtocol,
  ButtonProtocol,
  CascaderProtocol,
  FormItemProtocol,
  FormProtocol,
  MessageBoxOptions,
  MessageOptions,
  PopoverProtocol,
  SelectProtocol,
  UIAdapter
} from '@/types/uiAdapter'
import ns from '@/utils/ns'

/** 安全查询选择器，非法选择器返回 null */
const queryTarget = (selector: string): HTMLElement | null => {
  try {
    return document.querySelector(selector) as HTMLElement | null
  } catch {
    return null
  }
}

/** 解析 Modal 挂载目标，兼容选择器、类名和 HTMLElement */
const resolveAppendTo = (to?: string | HTMLElement): string | HTMLElement => {
  if (!to) return 'body'
  if (typeof to !== 'string') return to

  const target = queryTarget(to)
  if (target) return target

  // 仅对纯类名补全 "."，避免 "..vfc-x" 之类的非法选择器
  if (/^[\w-]+$/.test(to)) {
    return queryTarget(`.${to}`) || 'body'
  }

  return 'body'
}

/**
 * Element-Plus UI适配器
 */
const ElementPlusAdapter: UIAdapter = {
  injectCssVars: () => {
    const el = document.documentElement
    const style = el.style

    style.setProperty(`--${ns('color-primary')}`, 'var(--el-color-primary)')
    style.setProperty(`--${ns('color-primary-light')}`, 'var(--el-color-primary-light-9)')
    style.setProperty(`--${ns('color-danger')}`, 'var(--el-color-danger)')
    style.setProperty(`--${ns('color-bg')}`, 'var(--el-bg-color)')
    style.setProperty(`--${ns('color-bg-light')}`, 'var(--el-fill-color-light)')
    style.setProperty(`--${ns('color-bg-secondary')}`, '#ffffff')
    style.setProperty(`--${ns('color-bg-soft')}`, '#f5f7fa')
    style.setProperty(`--${ns('color-success')}`, 'var(--el-color-success)')
    style.setProperty(`--${ns('color-success-light')}`, 'var(--el-color-success-light-9)')
    style.setProperty(`--${ns('color-warning')}`, 'var(--el-color-warning)')
    style.setProperty(`--${ns('color-border')}`, 'var(--el-border-color)')
    style.setProperty(`--${ns('color-fill-light')}`, 'var(--el-fill-color-light)')
    style.setProperty(`--${ns('color-text-secondary')}`, 'var(--el-text-color-secondary)')
    style.setProperty(`--${ns('color-text-primary')}`, 'var(--el-text-color-primary)')
    style.setProperty(`--${ns('color-text-regular')}`, 'var(--el-text-color-regular)')
  },

  Form: defineComponent(
    (_, { slots, attrs, expose }) => {
      const propsAttrs = attrs as FormProtocol['props']
      const formRef = ref<FormInstance>()

      // 暴露底层 ElForm 的所有方法，符合 FormProtocol['expose'] 类型
      expose({
        validate: async (callback?: (valid: boolean, fields?: Record<string, any>) => void) => {
          return formRef.value!.validate(callback as any)
        },
        validateField: async (props: string | string[]) => {
          return formRef.value!.validateField(props)
        },
        resetFields: (props?: string | string[]) => {
          formRef.value?.resetFields(props as any)
        },
        scrollToField: (prop: string) => {
          formRef.value?.scrollToField(prop)
        },
        clearValidate: (props?: string | string[]) => {
          formRef.value?.clearValidate(props as any)
        }
      } satisfies FormProtocol['expose'])

      return () =>
        h(
          ElForm,
          {
            ref: formRef,
            ...attrs,
            // labelAlign -> labelPosition (Element-Plus 使用 labelPosition)
            labelPosition: propsAttrs.labelAlign
          },
          slots
        )
    },
    { inheritAttrs: false }
  ),

  FormItem: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as FormItemProtocol['props']

      return () =>
        h(
          ElFormItem,
          {
            ...omit(attrs, ['disableValidation', 'disable-validation']),
            labelPosition: propsAttrs.labelAlign,
            prop: propsAttrs.name
          },
          slots
        )
    },
    { inheritAttrs: false }
  ),

  Alert: defineComponent(
    (_, { attrs, slots }) => {
      const propsAttrs = attrs as AlertProtocol['props']

      return () => {
        let type: 'error' | 'success' | 'info' | 'warning' | 'primary' =
          propsAttrs.type || 'primary'

        if (propsAttrs.type === 'info') {
          type = 'primary'
        }

        return h(ElAlert, { ...attrs, type }, slots)
      }
    },
    { inheritAttrs: false }
  ),

  Tooltip: defineComponent(
    (_, { slots, attrs }) => {
      return () => h(ElTooltip, attrs, slots)
    },
    { inheritAttrs: false }
  ),

  Popover: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as PopoverProtocol['props']

      return () =>
        h(
          ElPopover,
          {
            ...omit(attrs, ['visible', 'trigger', 'onUpdate:visible']),
            visible: propsAttrs.visible,
            trigger: propsAttrs.trigger ?? 'click',
            showArrow: true,
            'onUpdate:visible': (visible: boolean) => {
              propsAttrs['onUpdate:visible']?.(visible)
            }
          },
          {
            reference: slots.default,
            default: slots.content
          }
        )
    },
    { inheritAttrs: false }
  ),

  Tag: defineComponent(
    (_, { slots, attrs }) => {
      return () => h(ElTag, attrs, slots)
    },
    { inheritAttrs: false }
  ),

  Input: defineComponent(
    (_, { slots, attrs }) => {
      return () => h(ElInput, attrs, slots)
    },
    { inheritAttrs: false }
  ),

  Textarea: defineComponent(
    (_, { slots, attrs }) => {
      return () => h(ElInput, { ...attrs, type: 'textarea' }, slots)
    },
    { inheritAttrs: false }
  ),

  Select: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as SelectProtocol['props']

      return () => {
        const multiple = propsAttrs.multiple || propsAttrs.tags
        const filterable = propsAttrs.filterable || propsAttrs.tags
        const optionList = propsAttrs.options ?? []

        return h(
          ElSelect,
          {
            ...omit(attrs, ['options', 'multiple', 'filterable', 'tags', 'allowCreate']),
            multiple,
            filterable,
            allowCreate: propsAttrs.tags
          },
          propsAttrs.options
            ? {
              default: () =>
                optionList.map((option) =>
                  h(ElOption, {
                    key: option.value,
                    label: option.label,
                    value: option.value,
                    disabled: option.disabled
                  })
                ),
              ...slots
            }
            : slots
        )
      }
    },
    { inheritAttrs: false }
  ),

  Card: defineComponent(
    (_, { slots, attrs }) => {
      return () => h(ElCard, attrs, slots)
    },
    { inheritAttrs: false }
  ),

  Divider: defineComponent(
    (_, { slots, attrs }) => {
      return () => h(ElDivider, attrs, slots)
    },
    { inheritAttrs: false }
  ),

  Tabs: defineComponent(
    (_, { slots, attrs }) => {
      return () => h(ElTabs, attrs, slots)
    },
    { inheritAttrs: false }
  ),

  TabPane: defineComponent(
    (_, { slots, attrs }) => {
      return () => h(ElTabPane, attrs, slots)
    },
    { inheritAttrs: false }
  ),

  Collapse: defineComponent(
    (_, { slots, attrs }) => {
      return () => h(ElCollapse, attrs, slots)
    },
    { inheritAttrs: false }
  ),

  CollapseItem: defineComponent(
    (_, { slots, attrs }) => {
      return () => h(ElCollapseItem, attrs, slots)
    },
    { inheritAttrs: false }
  ),

  Button: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as ButtonProtocol['props']

      return () =>
        h(ElButton, omit(propsAttrs, 'icon'), {
          ...slots,
          icon: propsAttrs.icon ? () => h(Icon, { name: propsAttrs.icon! }) : undefined
        })
    },
    { inheritAttrs: false }
  ),

  Modal: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as any

      return () =>
        h(
          ElDialog,
          {
            ...omit(attrs, ['to']),
            // to 参数映射到 ElDialog 的 appendTo
            appendTo: resolveAppendTo(propsAttrs.to)
          },
          slots
        )
    },
    { inheritAttrs: false }
  ),

  RadioGroup: defineComponent(
    (_, { slots, attrs }) => {
      return () =>
        h(ElRadioGroup, { ...attrs, type: attrs.isButtonOption ? 'button' : 'radio' }, slots)
    },
    { inheritAttrs: false }
  ),

  CheckboxGroup: defineComponent(
    (_, { slots, attrs }) => {
      return () =>
        h(ElCheckboxGroup, { ...attrs, type: attrs.isButtonOption ? 'button' : 'checkbox' }, slots)
    },
    { inheritAttrs: false }
  ),

  Switch: defineComponent(
    (_, { attrs }) => {
      return () => h(ElSwitch, attrs)
    },
    { inheritAttrs: false }
  ),

  InputNumber: defineComponent(
    (_, { attrs }) => {
      return () => h(ElInputNumber, { ...attrs, controlsPosition: 'right' })
    },
    { inheritAttrs: false }
  ),

  Slider: defineComponent(
    (_, { attrs }) => {
      return () => h(ElSlider, attrs)
    },
    { inheritAttrs: false }
  ),

  Rate: defineComponent(
    (_, { attrs }) => {
      return () => h(ElRate, attrs)
    },
    { inheritAttrs: false }
  ),

  ColorPicker: defineComponent(
    (_, { attrs }) => {
      return () => h(ElColorPicker, attrs)
    },
    { inheritAttrs: false }
  ),

  DatePicker: defineComponent(
    (_, { attrs }) => {
      return () => h(ElDatePicker, attrs)
    },
    { inheritAttrs: false }
  ),

  Cascader: defineComponent(
    (_, { attrs, slots }) => {
      return () => {
        const propsAttrs = attrs as CascaderProtocol['props']

        return h(
          ElCascader,
          {
            ...attrs,
            props: {
              multiple: propsAttrs.multiple
            }
          },
          slots
        )
      }
    },
    { inheritAttrs: false }
  ),

  Message: {
    success: (message: string, options?: MessageOptions) => {
      ElMessage.success({
        message,
        ...options
      })
    },
    warning: (message: string, options?: MessageOptions) => {
      ElMessage.warning({
        message,
        ...options
      })
    },
    info: (message: string, options?: MessageOptions) => {
      ElMessage.info({
        message,
        ...options
      })
    },
    error: (message: string | MessageOptions, options?: MessageOptions) => {
      if (typeof message === 'string') {
        ElMessage.error({
          message,
          ...options
        })
      } else {
        ElMessage.error(message)
      }
    },
    confirm: async (
      message: string,
      title?: string,
      options?: MessageBoxOptions
    ): Promise<void> => {
      await ElMessageBox.confirm(message, title || '提示', {
        confirmButtonText: options?.confirmButtonText || '确定',
        cancelButtonText: options?.cancelButtonText || '取消',
        type: options?.type || 'warning',
        ...options
      })
    },
    alert: async (message: string, title?: string, options?: MessageBoxOptions): Promise<void> => {
      await ElMessageBox.alert(message, title || '提示', {
        confirmButtonText: options?.confirmButtonText || '确定',
        type: options?.type || 'info',
        ...options
      })
    }
  }
}

export default ElementPlusAdapter
