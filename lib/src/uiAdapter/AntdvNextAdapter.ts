import {
  Alert as AntAlert,
  Button,
  Card,
  Cascader,
  CheckboxGroup,
  Collapse,
  CollapsePanel,
  ColorPicker,
  DatePicker,
  DateRangePicker,
  Divider,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  RadioGroup,
  Rate,
  Select,
  Slider,
  Switch,
  TabPane,
  Tabs,
  Tag,
  TextArea,
  Tooltip
} from 'antdv-next'
import { omit } from 'lodash'
import { defineComponent, Fragment, h, isVNode, ref, type VNode } from 'vue'
import { Icon } from '@/components'
import type {
  AlertProtocol,
  ButtonProtocol,
  CardProtocol,
  CheckboxGroupProtocol,
  CollapseItemProtocol,
  CollapseProtocol,
  ColorPickerProtocol,
  DatePickerProtocol,
  DividerProtocol,
  FormItemProtocol,
  FormProtocol,
  InputNumberProtocol,
  InputProtocol,
  MessageBoxOptions,
  MessageOptions,
  ModalProtocol,
  RadioGroupProtocol,
  RateProtocol,
  SelectProtocol,
  SliderProtocol,
  SwitchProtocol,
  TabPaneProtocol,
  TabsProtocol,
  TagProtocol,
  TextareaProtocol,
  TooltipProtocol,
  UIAdapter
} from '@/types/uiAdapter'
import ns from '@/utils/ns'

type ProtocolSize = 'large' | 'default' | 'small' | undefined

/**
 * 将协议中的 default 尺寸转换为 antdv-next 的 medium 尺寸
 */
const normalizeSize = (size?: ProtocolSize): 'large' | 'medium' | 'small' | undefined => {
  if (!size) return undefined
  if (size === 'default') return 'medium'
  return size
}

/**
 * Element Plus 风格的表单字段名称为 string | string[]，
 * antdv-next 的字段名参数需要统一为数组
 */
const normalizeNameList = (names?: string | string[]): any[] | undefined => {
  if (names === undefined) return undefined
  return Array.isArray(names) ? names : [names]
}

/**
 * 将协议中的左右对齐转换为 antdv-next 的 start/end
 */
const normalizeLabelAlign = (align?: 'left' | 'right' | 'top'): 'start' | 'end' | undefined => {
  if (align === 'left') return 'start'
  if (align === 'right') return 'end'
  return undefined
}

/**
 * 计算 FormItem 的 labelCol
 */
const getLabelCol = (labelWidth?: string | number) => {
  if (labelWidth === undefined || labelWidth === null) return undefined

  const width = typeof labelWidth === 'number' ? `${labelWidth}px` : labelWidth

  return {
    style: {
      width
    }
  } as any
}

/**
 * 将协议中的 Tooltip 位置转换为 antdv-next 的位置
 */
const tooltipPlacementMap: Record<string, any> = {
  'top-start': 'topLeft',
  'top-end': 'topRight',
  'bottom-start': 'bottomLeft',
  'bottom-end': 'bottomRight',
  'left-start': 'leftTop',
  'left-end': 'leftBottom',
  'right-start': 'rightTop',
  'right-end': 'rightBottom'
}

const normalizeTooltipPlacement = (placement?: string): any => {
  if (!placement) return undefined
  return tooltipPlacementMap[placement] ?? placement
}

const normalizeTooltipTrigger = (trigger?: string): any => {
  if (trigger === 'contextmenu') return 'contextMenu'
  return trigger
}

/**
 * 计算按钮形状
 */
const getButtonShape = (circle?: boolean, round?: boolean): 'circle' | 'round' | undefined => {
  if (circle) return 'circle'
  if (round) return 'round'
  return undefined
}

/**
 * 将协议中的颜色格式转换为 antdv-next 支持的格式
 */
const normalizeColorFormat = (format?: 'hex' | 'rgb' | 'hsl' | 'hsv'): 'hex' | 'rgb' | 'hsb' => {
  if (format === 'rgb') return 'rgb'
  if (format === 'hsv') return 'hsb'
  return 'hex'
}

/**
 * 将 antdv-next ColorPicker 的值统一转换为字符串
 */
const getColorString = (value: any, format: 'hex' | 'rgb' | 'hsl' | 'hsv'): string | undefined => {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return value

  if (typeof value.isGradient === 'function' && value.isGradient()) {
    return value.toCssString?.()
  }

  if (format === 'rgb') return value.toRgbString?.()
  if (format === 'hsv') return value.toHsbString?.()
  return value.toHexString?.()
}

/**
 * 扁平化插槽中的 Fragment，便于将 TabPane / CollapseItem 转换为 items
 */
const flattenVNodes = (nodes: any[]): VNode[] => {
  return nodes.reduce<VNode[]>((result, node) => {
    if (!isVNode(node)) return result

    if (node.type === Fragment) {
      const children = Array.isArray(node.children) ? node.children : []
      result.push(...flattenVNodes(children))
      return result
    }

    result.push(node)
    return result
  }, [])
}

/**
 * 获取组件 VNode 上某个具名插槽的渲染结果
 */
const getNodeSlot = (node: VNode, name: string) => {
  const slots = node.children as Record<string, any> | undefined
  const slot = slots?.[name]

  if (typeof slot === 'function') return slot()
  return slot
}

/**
 * 将 TabPane 子节点转换为 antdv-next Tabs 需要的 items
 */
const getTabsItems = (nodes: VNode[]) => {
  return flattenVNodes(nodes).map((node, index) => {
    const props = (node.props || {}) as Record<string, any>
    const label = getNodeSlot(node, 'label') ?? props.label

    return {
      key: props.name ?? node.key ?? index,
      label,
      content: () => getNodeSlot(node, 'default') ?? props.content,
      disabled: props.disabled,
      closable: props.closable
    }
  })
}

/**
 * 将 CollapseItem 子节点转换为 antdv-next Collapse 需要的 items
 */
const getCollapseItems = (nodes: VNode[]) => {
  return flattenVNodes(nodes).map((node, index) => {
    const props = (node.props || {}) as Record<string, any>
    const label = getNodeSlot(node, 'title') ?? props.title

    return {
      key: props.name ?? node.key ?? index,
      label,
      // antdv-next Collapse 的 content 只接受 VNode，不能传函数
      content: getNodeSlot(node, 'default'),
      collapsible: props.disabled ? ('disabled' as const) : undefined
    }
  })
}

/**
 * antdv-next UI适配器
 */
const AntdvNextAdapter: UIAdapter = {
  injectCssVars: () => {
    const el = document.documentElement
    const style = el.style

    // 主色
    style.setProperty(`--${ns('color-primary')}`, '#1677ff')
    style.setProperty(`--${ns('color-primary-light')}`, '#e6f4ff')

    // 语义色
    style.setProperty(`--${ns('color-success')}`, '#52c41a')
    style.setProperty(`--${ns('color-success-light')}`, '#f6ffed')
    style.setProperty(`--${ns('color-warning')}`, '#faad14')
    style.setProperty(`--${ns('color-danger')}`, '#ff4d4f')

    // 背景 / 边框
    style.setProperty(`--${ns('color-bg')}`, '#ffffff')
    style.setProperty(`--${ns('color-bg-secondary')}`, '#ffffff')
    style.setProperty(`--${ns('color-bg-soft')}`, '#f5f5f5')
    style.setProperty(`--${ns('color-border')}`, '#d9d9d9')
    style.setProperty(`--${ns('color-fill-light')}`, '#f5f5f5')

    // 文本
    style.setProperty(`--${ns('color-text-primary')}`, 'rgba(0, 0, 0, 0.88)')
    style.setProperty(`--${ns('color-text-regular')}`, 'rgba(0, 0, 0, 0.65)')
    style.setProperty(`--${ns('color-text-secondary')}`, 'rgba(0, 0, 0, 0.45)')
  },

  Form: defineComponent(
    (_, { slots, attrs, expose }) => {
      const propsAttrs = attrs as FormProtocol['props']
      const formRef = ref()

      // 暴露底层 antdv-next Form 的常用实例方法
      expose({
        validate: async (...args: any[]) => {
          await formRef.value?.validate(...args)
          return true
        },
        validateField: async (names: string | string[]) => {
          await formRef.value?.validateFields(normalizeNameList(names))
          return true
        },
        validateFields: (...args: any[]) => formRef.value?.validateFields(...args),
        resetFields: (names?: string | string[]) => {
          formRef.value?.resetFields(normalizeNameList(names))
        },
        scrollToField: (...args: any[]) => formRef.value?.scrollToField(...args),
        clearValidate: (names?: string | string[]) => {
          formRef.value?.clearValidate(normalizeNameList(names))
        },
        getFieldValue: (...args: any[]) => formRef.value?.getFieldValue(...args),
        getFieldsValue: (...args: any[]) => formRef.value?.getFieldsValue(...args),
        setFieldsValue: (...args: any[]) => formRef.value?.setFieldsValue(...args)
      } satisfies FormProtocol['expose'] & Record<string, any>)

      return () => {
        let layout: 'horizontal' | 'inline' | 'vertical' = 'horizontal'

        if (propsAttrs.inline) {
          layout = 'inline'
        } else if (propsAttrs.labelAlign === 'top') {
          layout = 'vertical'
        }

        return h(
          Form,
          {
            ref: formRef,
            ...omit(attrs, [
              'scrollToError',
              'labelWidth',
              'labelAlign',
              'inline',
              'hideRequiredAsterisk'
            ]),
            colon: false,
            layout,
            labelAlign: normalizeLabelAlign(propsAttrs.labelAlign),
            labelCol: getLabelCol(propsAttrs.labelWidth),
            scrollToFirstError: propsAttrs.scrollToError,
            requiredMark: propsAttrs.hideRequiredAsterisk ? false : undefined,
            size: normalizeSize(propsAttrs.size)
          },
          slots
        )
      }
    },
    { inheritAttrs: false }
  ),

  FormItem: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as FormItemProtocol['props']

      return () => {
        const hasError = Boolean(propsAttrs.error)

        let itemSlots = slots
        if (!slots.help && slots.error) {
          itemSlots = {
            ...slots,
            help: slots.error
          }
        }

        const itemClass =
          propsAttrs.showMessage === false
            ? [(attrs as any).class, 'hide-message']
            : (attrs as any).class

        return h(
          FormItem,
          {
            ...omit(attrs, [
              'labelWidth',
              'labelAlign',
              'size',
              'error',
              'showMessage',
              'disableValidation',
              'disable-validation'
            ]),
            class: itemClass,
            labelCol: getLabelCol(propsAttrs.labelWidth),
            // 未显式声明 labelAlign 时不要传 layout，否则会覆盖 Form 的 vertical 布局
            layout:
              propsAttrs.labelAlign === 'top'
                ? 'vertical'
                : propsAttrs.labelAlign
                  ? 'horizontal'
                  : undefined,
            labelAlign: normalizeLabelAlign(propsAttrs.labelAlign),
            validateStatus: hasError ? 'error' : undefined,
            help: hasError ? propsAttrs.error : undefined
          },
          itemSlots
        )
      }
    },
    { inheritAttrs: false }
  ),

  Input: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as InputProtocol['props']

      return () => {
        const { prepend, append, ...restSlots } = slots

        return h(
          Input,
          {
            ...omit(attrs, ['modelValue', 'onUpdate:modelValue', 'clearable', 'showWordLimit']),
            value: propsAttrs.modelValue,
            'onUpdate:value': (value?: string | number) => {
              propsAttrs['onUpdate:modelValue']?.(value === undefined ? '' : String(value))
            },
            allowClear: propsAttrs.clearable,
            showCount: propsAttrs.showWordLimit,
            maxlength: propsAttrs.maxlength,
            onChange: (event: any) => {
              const value = event?.target?.value ?? event
              propsAttrs.onChange?.(value)
            },
            size: normalizeSize(propsAttrs.size)
          },
          {
            ...restSlots,
            addonBefore: prepend,
            addonAfter: append
          }
        )
      }
    },
    { inheritAttrs: false }
  ),

  Textarea: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as TextareaProtocol['props']

      return () =>
        h(
          TextArea,
          {
            ...omit(attrs, ['modelValue', 'onUpdate:modelValue', 'clearable', 'showWordLimit']),
            value: propsAttrs.modelValue,
            'onUpdate:value': (value?: string | number) => {
              propsAttrs['onUpdate:modelValue']?.(value === undefined ? '' : String(value))
            },
            allowClear: propsAttrs.clearable,
            showCount: propsAttrs.showWordLimit,
            maxlength: propsAttrs.maxlength,
            autoSize: propsAttrs.autosize,
            size: normalizeSize(propsAttrs.size),
            onChange: (event: any) => {
              const value = event?.target?.value ?? event
              propsAttrs.onChange?.(value)
            }
          },
          slots
        )
    },
    { inheritAttrs: false }
  ),

  Select: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as SelectProtocol['props']

      return () => {
        const { empty, prefix, ...restSlots } = slots
        const selectSlots: Record<string, any> = {
          ...restSlots
        }

        if (prefix) selectSlots.prefix = prefix
        if (empty) selectSlots.notFoundContent = empty

        return h(
          Select as any,
          {
            ...omit(attrs, [
              'modelValue',
              'onUpdate:modelValue',
              'clearable',
              'filterable',
              'multiple'
            ]),
            value: propsAttrs.modelValue,
            'onUpdate:value': (value: any) => {
              propsAttrs['onUpdate:modelValue']?.(value)
            },
            allowClear: propsAttrs.clearable,
            showSearch: propsAttrs.filterable,
            mode: propsAttrs.multiple ? 'multiple' : undefined,
            loading: propsAttrs.loading,
            size: normalizeSize(propsAttrs.size)
          },
          selectSlots
        )
      }
    },
    { inheritAttrs: false }
  ),

  Card: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as CardProtocol['props']

      return () => {
        const cardSlots = slots.header
          ? {
              ...slots,
              title: slots.header
            }
          : slots

        const cardStyles = (attrs as any).styles

        return h(
          Card,
          {
            ...omit(attrs, ['header', 'shadow', 'bodyStyle']),
            title: propsAttrs.header,
            hoverable: propsAttrs.shadow === 'hover',
            styles: propsAttrs.bodyStyle
              ? {
                  ...cardStyles,
                  body: propsAttrs.bodyStyle
                }
              : cardStyles
          },
          cardSlots
        )
      }
    },
    { inheritAttrs: false }
  ),

  Divider: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as DividerProtocol['props']

      return () =>
        h(
          Divider,
          {
            ...omit(attrs, ['direction', 'contentPosition', 'borderStyle']),
            orientation: propsAttrs.direction === 'vertical' ? 'vertical' : 'horizontal',
            titlePlacement: propsAttrs.contentPosition,
            variant: propsAttrs.borderStyle
          },
          slots
        )
    },
    { inheritAttrs: false }
  ),

  Tabs: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as TabsProtocol['props']

      return () => {
        let tabPlacement: 'top' | 'end' | 'bottom' | 'start' | undefined
        if (propsAttrs.tabPosition === 'right') {
          tabPlacement = 'end'
        } else if (propsAttrs.tabPosition === 'left') {
          tabPlacement = 'start'
        } else if (propsAttrs.tabPosition) {
          tabPlacement = propsAttrs.tabPosition
        }

        let tabsType: 'line' | 'card' | 'editable-card' = 'line'
        if (propsAttrs.type === 'card' || propsAttrs.type === 'border-card') {
          tabsType = 'card'
        }
        if (propsAttrs.editable || propsAttrs.addable || propsAttrs.closable) {
          tabsType = 'editable-card'
        }

        const sourceItems = getTabsItems(slots.default?.() ?? [])
        const items = sourceItems.map((item) => ({
          ...item,
          key: String(item.key)
        }))
        const activeKey =
          propsAttrs.modelValue === undefined ? undefined : String(propsAttrs.modelValue)

        // antdv-next 的 activeKey 要求字符串，事件回调时再还原为原始 key 类型
        const resolveTabKey = (key: string | number | undefined) => {
          const item = sourceItems.find((source) => String(source.key) === String(key))
          return item?.key ?? key
        }

        return h(
          Tabs as any,
          {
            ...omit(attrs, [
              'modelValue',
              'onUpdate:modelValue',
              'type',
              'tabPosition',
              'editable',
              'addable',
              'onTabChange',
              'onTabClick',
              'onTabRemove',
              'onTabAdd'
            ]),
            activeKey,
            'onUpdate:activeKey': (value: string | number) => {
              propsAttrs['onUpdate:modelValue']?.(resolveTabKey(value) as string | number)
            },
            items,
            type: tabsType,
            tabPlacement,
            hideAdd: tabsType === 'editable-card' ? !propsAttrs.addable : undefined,
            onChange: (key: string | number) => {
              propsAttrs.onTabChange?.(resolveTabKey(key) as string | number)
            },
            onTabClick: (key: string | number, event: Event) => {
              propsAttrs.onTabClick?.(resolveTabKey(key) as string | number, event)
            },
            onEdit: (target: MouseEvent | KeyboardEvent | string, action: 'add' | 'remove') => {
              if (action === 'add') {
                propsAttrs.onTabAdd?.()
                return
              }
              propsAttrs.onTabRemove?.(resolveTabKey(target as string | number) as string | number)
            }
          },
          {}
        )
      }
    },
    { inheritAttrs: false }
  ),

  TabPane: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as TabPaneProtocol['props']

      return () =>
        h(
          TabPane as any,
          {
            ...omit(attrs, ['label', 'name', 'lazy']),
            key: propsAttrs.name,
            tab: propsAttrs.label,
            destroyOnHidden: propsAttrs.lazy
          },
          slots
        )
    },
    { inheritAttrs: false }
  ),

  Collapse: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as CollapseProtocol['props']

      return () => {
        const items = getCollapseItems(slots.default?.() ?? [])

        return h(
          Collapse as any,
          {
            ...omit(attrs, ['modelValue', 'onUpdate:modelValue']),
            activeKey: propsAttrs.modelValue,
            'onUpdate:activeKey': (value: string | number | Array<string | number>) => {
              propsAttrs['onUpdate:modelValue']?.(value)
            },
            accordion: propsAttrs.accordion,
            onChange: (value: string | number | Array<string | number>) => {
              propsAttrs.onChange?.(value)
            },
            items
          },
          {}
        )
      }
    },
    { inheritAttrs: false }
  ),

  CollapseItem: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as CollapseItemProtocol['props']

      return () => {
        const itemSlots = slots.title
          ? {
              ...slots,
              header: slots.title
            }
          : slots

        return h(
          CollapsePanel as any,
          {
            ...omit(attrs, ['name', 'title']),
            key: propsAttrs.name,
            header: propsAttrs.title,
            collapsible: propsAttrs.disabled ? 'disabled' : undefined
          },
          itemSlots
        )
      }
    },
    { inheritAttrs: false }
  ),

  Button: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as ButtonProtocol['props']

      return () => {
        // type 适配: success/warning 使用 antdv-next 的 color/variant 语义色
        const type = propsAttrs.type
        let buttonType: 'primary' | 'dashed' | 'link' | 'text' | 'default' | undefined
        let buttonColor: string | undefined
        let buttonVariant: 'solid' | 'outlined' | undefined

        if (propsAttrs.link) {
          buttonType = 'link'
        } else if (propsAttrs.text) {
          buttonType = 'text'
        } else if (type === 'primary') {
          buttonType = 'primary'
          if (propsAttrs.plain) {
            buttonType = undefined
            buttonColor = 'primary'
            buttonVariant = 'outlined'
          }
        } else if (type === 'danger') {
          buttonType = undefined
          buttonColor = 'danger'
          buttonVariant = propsAttrs.plain ? 'outlined' : 'solid'
        } else if (type === 'success') {
          buttonType = 'default'
          buttonColor = 'green'
          buttonVariant = propsAttrs.plain ? 'outlined' : 'solid'
        } else if (type === 'warning') {
          buttonType = 'default'
          buttonColor = 'orange'
          buttonVariant = propsAttrs.plain ? 'outlined' : 'solid'
        } else if (type === 'info') {
          buttonType = 'default'
        } else {
          buttonType = type as 'primary' | 'dashed' | 'link' | 'text' | 'default'
        }

        return h(
          Button as any,
          {
            ...omit(attrs, ['icon', 'plain', 'round', 'circle', 'text', 'link']),
            ...(buttonColor ? { color: buttonColor } : {}),
            ...(buttonVariant ? { variant: buttonVariant } : {}),
            type: buttonType,
            danger: type === 'danger',
            shape: getButtonShape(propsAttrs.circle, propsAttrs.round),
            size: normalizeSize(propsAttrs.size)
          },
          {
            ...slots,
            icon: propsAttrs.icon ? () => h(Icon, { name: propsAttrs.icon! }) : undefined
          }
        )
      }
    },
    { inheritAttrs: false }
  ),

  Modal: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as ModalProtocol['props']

      return () => {
        let getContainer: (() => HTMLElement) | undefined
        if (propsAttrs.to) {
          if (typeof propsAttrs.to === 'string') {
            getContainer = () => document.querySelector(propsAttrs.to as string) || document.body
          } else {
            getContainer = () => propsAttrs.to as HTMLElement
          }
        } else {
          getContainer = () => document.body
        }

        let mask: boolean | { closable?: boolean } | undefined
        if (propsAttrs.modal === false) {
          mask = false
        } else if (propsAttrs.closeOnClickModal !== undefined) {
          mask = {
            closable: propsAttrs.closeOnClickModal
          }
        }

        let modalStyles = (attrs as any).styles
        if (propsAttrs.top) {
          modalStyles = {
            ...modalStyles,
            wrapper: {
              ...modalStyles?.wrapper,
              paddingTop: propsAttrs.top
            }
          }
        }

        const modalSlots = slots.header
          ? {
              ...slots,
              title: slots.header
            }
          : slots

        return h(
          Modal,
          {
            ...omit(attrs, [
              'modelValue',
              'onUpdate:modelValue',
              'center',
              'closeOnClickModal',
              'closeOnPressEscape',
              'showClose',
              'destroyOnClose',
              'lockScroll',
              'to',
              'appendToBody',
              'modal',
              'fullscreen',
              'top',
              'onOpen',
              'onOpened',
              'onClose',
              'onClosed'
            ]),
            open: propsAttrs.modelValue,
            'onUpdate:open': (value: boolean) => {
              propsAttrs['onUpdate:modelValue']?.(value)
              if (value) propsAttrs.onOpen?.()
            },
            centered: propsAttrs.center,
            width: propsAttrs.fullscreen ? '100vw' : propsAttrs.width,
            styles: modalStyles,
            mask,
            keyboard: propsAttrs.closeOnPressEscape,
            closable: propsAttrs.showClose,
            scrollLock: propsAttrs.lockScroll,
            getContainer,
            destroyOnHidden: propsAttrs.destroyOnClose,
            // 没有 footer 插槽时隐藏默认 footer，保持与 Element Plus 行为一致
            footer: slots.footer ? undefined : null,
            afterOpenChange: (open: boolean) => {
              if (open) {
                propsAttrs.onOpened?.()
                return
              }
              propsAttrs.onClosed?.()
            },
            onOk: propsAttrs.onClose,
            onCancel: propsAttrs.onClose
          },
          modalSlots
        )
      }
    },
    { inheritAttrs: false }
  ),

  RadioGroup: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as RadioGroupProtocol['props']

      return () =>
        h(
          RadioGroup as any,
          {
            ...omit(attrs, ['modelValue', 'onUpdate:modelValue', 'isButtonOption']),
            value: propsAttrs.modelValue,
            optionType: propsAttrs.isButtonOption ? 'button' : 'default',
            'onUpdate:value': (value: any) => {
              propsAttrs['onUpdate:modelValue']?.(value)
            },
            onChange: (event: any) => {
              const value = event?.target?.value ?? event
              propsAttrs.onChange?.(value)
            }
          },
          slots
        )
    },
    { inheritAttrs: false }
  ),

  CheckboxGroup: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as CheckboxGroupProtocol['props']

      return () =>
        h(
          CheckboxGroup as any,
          {
            ...omit(attrs, ['modelValue', 'onUpdate:modelValue', 'isButtonOption']),
            value: propsAttrs.modelValue,
            'onUpdate:value': (value: any[]) => {
              propsAttrs['onUpdate:modelValue']?.(value)
            }
          },
          slots
        )
    },
    { inheritAttrs: false }
  ),

  Switch: defineComponent(
    (_, { attrs }) => {
      const propsAttrs = attrs as SwitchProtocol['props']

      return () =>
        h(Switch as any, {
          ...omit(attrs, ['modelValue', 'onUpdate:modelValue', 'activeText', 'inactiveText']),
          checked: propsAttrs.modelValue,
          'onUpdate:checked': (value: boolean) => {
            propsAttrs['onUpdate:modelValue']?.(value)
          },
          checkedChildren: propsAttrs.activeText,
          unCheckedChildren: propsAttrs.inactiveText
        })
    },
    { inheritAttrs: false }
  ),

  InputNumber: defineComponent(
    (_, { attrs }) => {
      const propsAttrs = attrs as InputNumberProtocol['props']

      return () =>
        h(InputNumber as any, {
          ...omit(attrs, ['modelValue', 'onUpdate:modelValue']),
          value: propsAttrs.modelValue,
          'onUpdate:value': (value: number | undefined) => {
            propsAttrs['onUpdate:modelValue']?.(value)
          }
        })
    },
    { inheritAttrs: false }
  ),

  Slider: defineComponent(
    (_, { attrs }) => {
      const propsAttrs = attrs as SliderProtocol['props']

      return () =>
        h(Slider as any, {
          ...omit(attrs, ['modelValue', 'onUpdate:modelValue']),
          value: propsAttrs.modelValue,
          'onUpdate:value': (value: number | [number, number]) => {
            propsAttrs['onUpdate:modelValue']?.(value)
          }
        })
    },
    { inheritAttrs: false }
  ),

  Rate: defineComponent(
    (_, { attrs }) => {
      const propsAttrs = attrs as RateProtocol['props']

      return () =>
        h(Rate as any, {
          ...omit(attrs, ['modelValue', 'onUpdate:modelValue', 'max']),
          value: propsAttrs.modelValue,
          'onUpdate:value': (value: number) => {
            propsAttrs['onUpdate:modelValue']?.(value)
          },
          count: propsAttrs.max
        })
    },
    { inheritAttrs: false }
  ),

  ColorPicker: defineComponent(
    (_, { attrs }) => {
      const propsAttrs = attrs as ColorPickerProtocol['props']

      return () => {
        const colorFormat = propsAttrs.colorFormat ?? 'hex'

        return h(ColorPicker as any, {
          ...omit(attrs, ['modelValue', 'onUpdate:modelValue', 'showAlpha', 'colorFormat']),
          value: propsAttrs.modelValue,
          'onUpdate:value': (value: any) => {
            propsAttrs['onUpdate:modelValue']?.(getColorString(value, colorFormat) as string)
          },
          disabledAlpha: propsAttrs.showAlpha === false,
          format: normalizeColorFormat(colorFormat),
          onChange: (_color: any, css: string) => {
            propsAttrs.onChange?.(css)
          },
          onChangeComplete: (value: any) => {
            const color = getColorString(value, colorFormat)
            if (color !== undefined) propsAttrs.onActiveChange?.(color)
          }
        })
      }
    },
    { inheritAttrs: false }
  ),

  DatePicker: defineComponent(
    (_, { attrs }) => {
      const propsAttrs = attrs as DatePickerProtocol['props']

      return () => {
        const isRangePicker =
          propsAttrs.type === 'daterange' ||
          propsAttrs.type === 'monthrange' ||
          propsAttrs.type === 'datetimerange'

        const PickerComponent = isRangePicker ? DateRangePicker : DatePicker

        let picker: 'date' | 'week' | 'month' | 'quarter' | 'year' | undefined
        if (propsAttrs.type === 'year') {
          picker = 'year'
        } else if (propsAttrs.type === 'month' || propsAttrs.type === 'monthrange') {
          picker = 'month'
        } else if (propsAttrs.type === 'week') {
          picker = 'week'
        }

        const showTime = propsAttrs.type === 'datetime' || propsAttrs.type === 'datetimerange'

        let adaptedDisabledDate: ((date: any) => boolean) | undefined
        if (propsAttrs.disabledDate) {
          adaptedDisabledDate = (dayjsDate: any) => {
            // antdv-next 传入 dayjs 对象，协议统一使用 Date
            const date =
              dayjsDate && typeof dayjsDate.toDate === 'function' ? dayjsDate.toDate() : dayjsDate
            return propsAttrs.disabledDate!(date)
          }
        }

        let placeholder: string | [string, string] | undefined = propsAttrs.placeholder
        if (propsAttrs.type?.includes('range')) {
          placeholder = [propsAttrs.startPlaceholder ?? '', propsAttrs.endPlaceholder ?? '']
        }

        return h(PickerComponent as any, {
          ...omit(attrs, [
            'modelValue',
            'onUpdate:modelValue',
            'type',
            'clearable',
            'startPlaceholder',
            'endPlaceholder'
          ]),
          value: propsAttrs.modelValue,
          'onUpdate:value': (value: any) => {
            propsAttrs['onUpdate:modelValue']?.(value)
          },
          picker,
          showTime,
          format: propsAttrs.format,
          valueFormat: propsAttrs.valueFormat,
          allowClear: propsAttrs.clearable,
          disabled: propsAttrs.disabled,
          placeholder,
          disabledDate: adaptedDisabledDate
        })
      }
    },
    { inheritAttrs: false }
  ),

  Cascader: defineComponent(
    (_, { attrs, slots }) => {
      const propsAttrs = attrs as any

      return () => {
        const { empty, ...restSlots } = slots
        const cascaderSlots: Record<string, any> = {
          ...restSlots
        }

        if (empty) cascaderSlots.notFoundContent = empty

        return h(
          Cascader,
          {
            ...omit(attrs, [
              'modelValue',
              'onUpdate:modelValue',
              'clearable',
              'filterable',
              'multiple'
            ]),
            value: propsAttrs.modelValue,
            'onUpdate:value': (value: any) => {
              propsAttrs['onUpdate:modelValue']?.(value)
            },
            allowClear: propsAttrs.clearable,
            showSearch: propsAttrs.filterable,
            multiple: propsAttrs.multiple,
            loading: propsAttrs.loading,
            size: normalizeSize(propsAttrs.size)
          },
          cascaderSlots
        )
      }
    },
    { inheritAttrs: false }
  ),

  Alert: defineComponent(
    (_, { attrs }) => {
      const propsAttrs = attrs as AlertProtocol['props']

      return () =>
        h(AntAlert, {
          ...omit(attrs, ['title']),
          title: propsAttrs.title,
          description: propsAttrs.description
        })
    },
    { inheritAttrs: false }
  ),

  Tooltip: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as TooltipProtocol['props']

      return () => {
        const tooltipSlots = slots.content
          ? {
              ...slots,
              title: slots.content
            }
          : slots

        return h(
          Tooltip,
          {
            ...omit(attrs, ['content', 'visible', 'effect', 'offset', 'showArrow', 'disabled']),
            title: propsAttrs.content,
            open: propsAttrs.disabled ? false : propsAttrs.visible,
            placement: normalizeTooltipPlacement(propsAttrs.placement),
            trigger: normalizeTooltipTrigger(propsAttrs.trigger),
            arrow: propsAttrs.showArrow !== false
          },
          tooltipSlots
        )
      }
    },
    { inheritAttrs: false }
  ),

  Tag: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = attrs as TagProtocol['props']

      return () => {
        let tagColor = propsAttrs.color
        if (!tagColor && propsAttrs.type) {
          const colorMap: Record<string, string> = {
            success: 'success',
            info: 'default',
            warning: 'warning',
            danger: 'error',
            primary: 'blue',
            default: 'default'
          }
          tagColor = colorMap[propsAttrs.type] || 'default'
        }

        let tagVariant: 'filled' | 'solid' | 'outlined' | undefined
        if (propsAttrs.effect === 'dark') {
          tagVariant = 'solid'
        } else if (propsAttrs.effect === 'plain') {
          tagVariant = 'outlined'
        } else if (propsAttrs.effect === 'light') {
          tagVariant = 'filled'
        }

        return h(
          Tag,
          {
            ...omit(attrs, ['type', 'effect', 'round', 'size', 'color']),
            color: tagColor,
            closable: propsAttrs.closable,
            variant: tagVariant,
            onClose: propsAttrs.onClose
          },
          slots
        )
      }
    },
    { inheritAttrs: false }
  ),

  Message: {
    success: (msg: string, options?: MessageOptions) => {
      message.success({
        content: msg,
        duration: options?.duration ? options.duration / 1000 : 3
      })
    },
    warning: (msg: string, options?: MessageOptions) => {
      message.warning({
        content: msg,
        duration: options?.duration ? options.duration / 1000 : 3
      })
    },
    info: (msg: string, options?: MessageOptions) => {
      message.info({
        content: msg,
        duration: options?.duration ? options.duration / 1000 : 3
      })
    },
    error: (msg: string | MessageOptions, options?: MessageOptions) => {
      if (typeof msg === 'string') {
        message.error({
          content: msg,
          duration: options?.duration ? options.duration / 1000 : 4.5
        })
      } else {
        message.error({
          content: msg.message || '',
          duration: msg.duration ? msg.duration / 1000 : 4.5
        })
      }
    },
    confirm: async (msg: string, title?: string, options?: MessageBoxOptions): Promise<void> => {
      return new Promise((resolve, reject) => {
        Modal.confirm({
          title: title || '提示',
          content: msg,
          okText: options?.confirmButtonText || '确定',
          cancelText: options?.cancelButtonText || '取消',
          okCancel: options?.showCancelButton !== false,
          centered: options?.center,
          onOk: () => {
            resolve()
          },
          onCancel: () => {
            reject('cancel')
          }
        })
      })
    },
    alert: async (msg: string, title?: string, options?: MessageBoxOptions): Promise<void> => {
      return new Promise((resolve) => {
        Modal.info({
          title: title || '提示',
          content: msg,
          okText: options?.confirmButtonText || '确定',
          centered: options?.center,
          onOk: () => {
            resolve()
          }
        })
      })
    }
  }
}

export default AntdvNextAdapter
