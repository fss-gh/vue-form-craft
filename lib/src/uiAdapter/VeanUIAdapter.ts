import {
  SAccordion,
  SAlert,
  SButtonLoading,
  SCard,
  SCascader,
  SCheckboxCardGroup,
  SCheckboxGroup,
  SColorPicker,
  SDatePicker,
  SDateRangePicker,
  SDialog,
  SSeparator,
  SInput,
  SInputNumber,
  SRadioGroup,
  SRadioGroupCard,
  SRating,
  SSelect,
  SSlider,
  SSwitch,
  STabs,
  STag,
  STextarea,
  STooltip,
  dialog,
  toast
} from '@vean/ui'
import { cloneDeep, get, omit, set, unset } from 'lodash'
import {
  defineComponent,
  Fragment,
  h,
  inject,
  isVNode,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  unref,
  watch,
  type InjectionKey,
  type Ref,
  type VNode
} from 'vue'
import { Icon } from '@/components'
import type {
  AlertProtocol,
  ButtonProtocol,
  CardProtocol,
  CascaderProtocol,
  CheckboxGroupProtocol,
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
  TabsProtocol,
  TagProtocol,
  TextareaProtocol,
  TooltipProtocol,
  UIAdapter
} from '@/types/uiAdapter'
import ns from '@/utils/ns'

type ProtocolSize = 'large' | 'default' | 'small' | undefined
type VeanSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
type ValidationTrigger = 'blur' | 'change'
type DateGranularity = 'day' | 'minute'

interface FieldController {
  name?: string
  validate: () => Promise<boolean>
  clearValidate: () => void
  getError: () => string
  scrollTo: () => void
  resetTouched: () => void
}

interface VeanFormContext {
  readonly model: Record<string, any>
  readonly rules?: Record<string, any>
  readonly labelWidth?: string | number
  readonly labelAlign?: 'left' | 'right' | 'top'
  readonly inline?: boolean
  readonly disabled?: boolean
  readonly size?: ProtocolSize
  readonly hideRequiredAsterisk?: boolean
  getRulesForName: (name?: string) => any[]
  registerField: (field: FieldController) => void
  unregisterField: (field: FieldController) => void
}

interface VeanFormItemContext {
  readonly name?: string
  notifyChange: () => void
  notifyBlur: () => void
  validate: (trigger?: ValidationTrigger) => Promise<boolean>
  clearValidate: () => void
}

const veanFormContextKey: InjectionKey<VeanFormContext> = Symbol('vean-form-context')
const veanFormItemContextKey: InjectionKey<VeanFormItemContext> = Symbol('vean-form-item-context')

/**
 * 将协议中的 default 尺寸转换为 Vean 的 md 尺寸
 */
const normalizeSize = (size?: ProtocolSize): VeanSize | undefined => {
  if (!size) return undefined
  if (size === 'large') return 'lg'
  if (size === 'small') return 'sm'
  return 'md'
}

const toCssWidth = (width?: string | number): string | undefined => {
  if (width === undefined || width === null) return undefined
  return typeof width === 'number' ? `${width}px` : width
}

/**
 * 将协议中的 to（可能是 HTMLElement，也可能是 ns() 生成的类名）解析为 Teleport 目标
 */
const resolveTeleportTarget = (to?: string | HTMLElement): string | HTMLElement | undefined => {
  if (!to) return undefined
  if (typeof to !== 'string' || typeof document === 'undefined') return to

  try {
    const direct = document.querySelector(to) as HTMLElement | null
    if (direct) return direct
  } catch {
    // 忽略非法选择器，继续按类名查找
  }

  try {
    const byClass = document.querySelector(`.${to}`) as HTMLElement | null
    if (byClass) return byClass
  } catch {
    // 忽略非法类名
  }

  // 目标尚未挂载时回退到 body，避免 Teleport 报错
  return document.body
}

/**
 * 调用事件处理器，兼容 Vue 合并多个同名监听器后产生的数组
 */
const callHandler = (handler: unknown, ...args: any[]) => {
  if (typeof handler === 'function') {
    handler(...args)
    return
  }
  if (Array.isArray(handler)) {
    handler.forEach((item) => {
      if (typeof item === 'function') item(...args)
    })
  }
}

/**
 * 兼容模板中的 kebab-case 属性（如 model-value / destroy-on-close）
 * 适配器不声明 props，Vue 不会自动把 kebab-case 转成 camelCase
 */
const normalizeAttrs = <T extends Record<string, any>>(attrs: T): T => {
  return new Proxy(attrs, {
    get(target, property, receiver) {
      if (typeof property === 'string' && !property.includes(':')) {
        const kebab = property.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)
        if (Object.prototype.hasOwnProperty.call(target, kebab)) {
          return target[kebab]
        }
      }
      return Reflect.get(target, property, receiver)
    }
  })
}

const isEmptyValue = (value: any): boolean => {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

const matchesTrigger = (rule: any, trigger?: ValidationTrigger): boolean => {
  if (!trigger) return true

  const ruleTrigger = rule?.trigger
  if (!ruleTrigger) return true
  if (Array.isArray(ruleTrigger)) return ruleTrigger.includes(trigger)
  return ruleTrigger === trigger
}

const hasRequiredRule = (rules: any[]): boolean => {
  return rules.some((rule) => rule?.required === true || rule?.type === 'required')
}

const resolveRuleMessage = (rule: any, fallback = '校验不通过'): string => {
  const message = typeof rule?.message === 'function' ? rule.message() : rule?.message
  if (typeof message === 'string' && message.length > 0) return message
  return fallback
}

const normalizeValidationError = (error: any, fallback: string): string => {
  if (error === undefined || error === null || error === false) return ''
  if (typeof error === 'string') return error || fallback
  if (error instanceof Error) return error.message || fallback
  if (Array.isArray(error)) {
    const first = error[0] as any
    return normalizeValidationError(first, fallback)
  }
  if (typeof error?.message === 'string') return error.message || fallback
  return fallback
}

const runCustomValidator = (rule: any, value: any, model?: Record<string, any>): Promise<void> => {
  return new Promise((resolve, reject) => {
    let settled = false

    const done = (error?: any) => {
      if (settled) return
      settled = true
      const message = normalizeValidationError(error, resolveRuleMessage(rule))
      if (message) {
        reject(message)
        return
      }
      resolve()
    }

    try {
      const result = rule.validator(rule, value, done, {}, model)

      if (result && typeof result.then === 'function') {
        result.then(
          () => done(),
          (error: any) => done(error)
        )
        return
      }

      if (result instanceof Error || typeof result === 'string') {
        done(result)
        return
      }

      if (Array.isArray(result) && result.length > 0) {
        done(result[0])
        return
      }

      // 老式 validator 通过 callback 返回结果；无 callback 参数时按同步返回值处理。
      if (typeof rule.validator !== 'function' || rule.validator.length < 3) {
        done()
      }
    } catch (error) {
      done(error)
    }
  })
}

/**
 * 校验单条 Element Plus / async-validator 风格的规则
 */
const validateRule = async (
  rule: any,
  value: any,
  model?: Record<string, any>
): Promise<string> => {
  if (!rule || typeof rule !== 'object') return ''

  const fallback = resolveRuleMessage(rule)
  const required = rule.required === true || rule.type === 'required'

  if (rule.whitespace && typeof value === 'string' && value.trim() === '') {
    return resolveRuleMessage(rule, '不能为空')
  }

  if (required && isEmptyValue(value)) {
    return resolveRuleMessage(rule)
  }

  if (isEmptyValue(value)) return ''

  const type = rule.type
  if (type === 'string' && typeof value !== 'string') return fallback
  if (type === 'number' && (typeof value !== 'number' || Number.isNaN(value))) return fallback
  if (type === 'integer' && (!Number.isInteger(value) || typeof value !== 'number')) return fallback
  if (type === 'float' && (typeof value !== 'number' || Number.isNaN(value))) return fallback
  if (type === 'boolean' && typeof value !== 'boolean') return fallback
  if (type === 'array' && !Array.isArray(value)) return fallback
  if (type === 'object' && (typeof value !== 'object' || Array.isArray(value))) return fallback
  if (type === 'date' && !(value instanceof Date)) return fallback
  if (type === 'regexp' && !(value instanceof RegExp)) return fallback
  if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) return fallback
  if (type === 'url' && !/^https?:\/\/\S+$/i.test(String(value))) return fallback
  if (type === 'hex' && !/^#?[0-9a-f]{6}$/i.test(String(value))) return fallback
  if (
    type === 'uuid' &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value))
  ) {
    return fallback
  }

  if (Array.isArray(rule.enum) && !rule.enum.includes(value)) {
    return fallback
  }

  if (rule.pattern !== undefined) {
    let pattern = rule.pattern
    if (typeof pattern === 'string') {
      try {
        pattern = new RegExp(pattern)
      } catch {
        return fallback
      }
    }
    if (pattern instanceof RegExp && !pattern.test(String(value))) return fallback
  }

  const isNumeric = typeof value === 'number'
  const isLengthValue = typeof value === 'string' || Array.isArray(value)

  if (rule.min !== undefined) {
    if (isNumeric && value < rule.min) return fallback
    if (isLengthValue && value.length < rule.min) return fallback
  }

  if (rule.max !== undefined) {
    if (isNumeric && value > rule.max) return fallback
    if (isLengthValue && value.length > rule.max) return fallback
  }

  if (rule.len !== undefined) {
    if (isNumeric && value !== rule.len) return fallback
    if (isLengthValue && value.length !== rule.len) return fallback
  }

  if (typeof rule.validator === 'function') {
    try {
      await runCustomValidator(rule, value, model)
    } catch (error) {
      return normalizeValidationError(error, fallback) || fallback
    }
  }

  return ''
}

/**
 * 将插槽中的 Fragment 扁平化，便于 TabPane / CollapseItem 转 items
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

const getNodeSlot = (node: VNode, name: string) => {
  const slots = node.children as Record<string, any> | undefined
  const slot = slots?.[name]
  if (typeof slot === 'function') return slot()
  return slot
}

const getTabsItems = (nodes: VNode[]) => {
  return flattenVNodes(nodes).map((node, index) => {
    const props = (node.props || {}) as Record<string, any>
    const value = props.name ?? node.key ?? index

    return {
      value,
      label: getNodeSlot(node, 'label') ?? props.label ?? String(value),
      disabled: props.disabled,
      renderLabel: () => getNodeSlot(node, 'label') ?? props.label ?? String(value),
      render: () => getNodeSlot(node, 'default')
    }
  })
}

const getCollapseItems = (nodes: VNode[]) => {
  return flattenVNodes(nodes).map((node, index) => {
    const props = (node.props || {}) as Record<string, any>
    const value = props.name ?? node.key ?? index

    return {
      value,
      title: props.title ?? String(value),
      disabled: props.disabled,
      renderTitle: () => getNodeSlot(node, 'title') ?? props.title ?? String(value),
      render: () => getNodeSlot(node, 'default')
    }
  })
}

const tooltipPlacementMap: Record<string, any> = {
  'top-start': 'top-start',
  'top-end': 'top-end',
  'bottom-start': 'bottom-start',
  'bottom-end': 'bottom-end',
  'left-start': 'left-start',
  'left-end': 'left-end',
  'right-start': 'right-start',
  'right-end': 'right-end'
}

const normalizeTooltipPlacement = (placement?: string): any => {
  if (!placement) return undefined
  return tooltipPlacementMap[placement] ?? placement
}

const getButtonAppearance = (propsAttrs: ButtonProtocol['props']) => {
  const type = propsAttrs.type
  const plain = propsAttrs.plain === true

  if (propsAttrs.link) return { color: 'primary' as const, variant: 'link' as const }
  if (propsAttrs.text || type === 'text') {
    return { color: 'carbon' as const, variant: 'ghost' as const }
  }

  if (type === 'primary') {
    return { color: 'primary' as const, variant: plain ? ('outline' as const) : ('solid' as const) }
  }
  if (type === 'success') {
    return { color: 'success' as const, variant: plain ? ('outline' as const) : ('solid' as const) }
  }
  if (type === 'warning') {
    return { color: 'warning' as const, variant: plain ? ('outline' as const) : ('solid' as const) }
  }
  if (type === 'danger') {
    return {
      color: 'destructive' as const,
      variant: plain ? ('outline' as const) : ('solid' as const)
    }
  }
  if (type === 'info') {
    return { color: 'info' as const, variant: plain ? ('outline' as const) : ('solid' as const) }
  }

  return { color: 'carbon' as const, variant: 'outline' as const }
}

const getButtonShape = (circle?: boolean, round?: boolean): 'circle' | 'rounded' | undefined => {
  if (circle) return 'circle'
  if (round) return 'rounded'
  return undefined
}

const mapThemeColor = (type?: TagProtocol['props']['type']) => {
  if (type === 'primary') return 'primary'
  if (type === 'success') return 'success'
  if (type === 'info') return 'info'
  if (type === 'warning') return 'warning'
  if (type === 'danger') return 'destructive'
  return 'carbon'
}

const mapAlertColor = (type?: AlertProtocol['props']['type']) => {
  if (type === 'success') return 'success'
  if (type === 'warning') return 'warning'
  if (type === 'error') return 'destructive'
  return 'info'
}

const mapAlertIcon = (type?: AlertProtocol['props']['type']) => {
  if (type === 'success') return 'lucide:circle-check'
  if (type === 'warning') return 'lucide:triangle-alert'
  if (type === 'error') return 'lucide:circle-x'
  return 'lucide:info'
}

const normalizeColorFormat = (format?: ColorPickerProtocol['props']['colorFormat']) => {
  if (format === 'rgb') return 'rgb'
  if (format === 'hsl') return 'hsl'
  // Vean 暂不支持 hsv，以 hsl 作为最接近的替代格式
  if (format === 'hsv') return 'hsl'
  return 'hex'
}

const toSliderValue = (
  value: SliderProtocol['props']['modelValue'],
  range?: boolean
): number[] => {
  if (Array.isArray(value)) return value
  if (typeof value === 'number') {
    if (range) return [value, value]
    return [value]
  }
  return []
}

const fromSliderValue = (
  value: number[],
  range?: boolean
): number | [number, number] | undefined => {
  if (!Array.isArray(value) || value.length === 0) return undefined
  if (range) {
    const start = value[0] ?? 0
    const end = value[1] ?? start
    return [start, end]
  }
  return value[0]
}

const padNumber = (value: number): string => String(value).padStart(2, '0')

const formatDate = (date: Date, pattern?: string): string | Date => {
  if (!pattern) return date

  return pattern
    .replace(/YYYY/g, String(date.getFullYear()))
    .replace(/YY/g, String(date.getFullYear()).slice(-2))
    .replace(/MM/g, padNumber(date.getMonth() + 1))
    .replace(/M/g, String(date.getMonth() + 1))
    .replace(/DD/g, padNumber(date.getDate()))
    .replace(/D/g, String(date.getDate()))
    .replace(/HH/g, padNumber(date.getHours()))
    .replace(/H/g, String(date.getHours()))
    .replace(/mm/g, padNumber(date.getMinutes()))
    .replace(/m/g, String(date.getMinutes()))
    .replace(/ss/g, padNumber(date.getSeconds()))
    .replace(/s/g, String(date.getSeconds()))
}

const parseDateWithPattern = (value: string, pattern: string): Date | undefined => {
  const tokenPattern = /YYYY|YY|MM|M|DD|D|HH|H|mm|m|ss|s/g
  const groups: string[] = []
  let regexSource = '^'
  let lastIndex = 0

  for (const match of pattern.matchAll(tokenPattern)) {
    const token = match[0]
    const index = match.index ?? 0
    regexSource += pattern.slice(lastIndex, index).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    if (token === 'YYYY' || token === 'YY') {
      regexSource += '(\\d{2,4})'
      groups.push('year')
    } else if (token === 'MM' || token === 'M') {
      regexSource += '(\\d{1,2})'
      groups.push('month')
    } else if (token === 'DD' || token === 'D') {
      regexSource += '(\\d{1,2})'
      groups.push('day')
    } else if (token === 'HH' || token === 'H') {
      regexSource += '(\\d{1,2})'
      groups.push('hour')
    } else if (token === 'mm' || token === 'm') {
      regexSource += '(\\d{1,2})'
      groups.push('minute')
    } else {
      regexSource += '(\\d{1,2})'
      groups.push('second')
    }

    lastIndex = index + token.length
  }

  regexSource += pattern.slice(lastIndex).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  regexSource += '$'

  const result = new RegExp(regexSource).exec(value)
  if (!result) return undefined

  const parts: Record<string, number> = {}
  groups.forEach((group, index) => {
    parts[group] = Number(result[index + 1])
  })

  const year = parts.year ?? new Date().getFullYear()
  const month = (parts.month ?? 1) - 1
  const day = parts.day ?? 1
  const date = new Date(
    year,
    month,
    day,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0
  )

  return Number.isNaN(date.getTime()) ? undefined : date
}

const parseDateValue = (value: any, valueFormat?: string): Date | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value
  }
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date
  }
  if (typeof value !== 'string') return undefined

  if (valueFormat) {
    const matched = parseDateWithPattern(value, valueFormat)
    if (matched) return matched
  }

  const direct = new Date(value)
  if (!Number.isNaN(direct.getTime())) return direct

  const normalized = new Date(value.replace(' ', 'T'))
  if (!Number.isNaN(normalized.getTime())) return normalized

  return undefined
}

const toVeanDateValue = (date: Date, granularity: DateGranularity) => {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (granularity === 'day') return day

  return {
    date: day,
    time: new Date(1970, 0, 1, date.getHours(), date.getMinutes(), date.getSeconds())
  }
}

const fromVeanDateValue = (value: any): Date | undefined => {
  if (!value) return undefined
  if (value instanceof Date) return value
  if (!(value.date instanceof Date)) return undefined

  const date = new Date(value.date.getTime())
  if (value.time instanceof Date) {
    date.setHours(value.time.getHours(), value.time.getMinutes(), value.time.getSeconds())
  }
  return date
}

const toVeanPickerValue = (
  value: DatePickerProtocol['props']['modelValue'],
  isRange: boolean,
  granularity: DateGranularity,
  valueFormat?: string
) => {
  if (isRange) {
    if (!Array.isArray(value)) return undefined

    const start = parseDateValue(value[0], valueFormat)
    const end = parseDateValue(value[1], valueFormat)

    return {
      start: start ? toVeanDateValue(start, granularity) : undefined,
      end: end ? toVeanDateValue(end, granularity) : undefined
    }
  }

  if (Array.isArray(value)) return undefined
  const date = parseDateValue(value, valueFormat)
  return date ? toVeanDateValue(date, granularity) : undefined
}

const fromVeanPickerValue = (
  value: any,
  isRange: boolean,
  valueFormat?: string
): string | Date | [string | Date, string | Date] | undefined => {
  const output = (date: Date | undefined) => {
    if (!date) return undefined
    return formatDate(date, valueFormat)
  }

  if (isRange) {
    const start = output(fromVeanDateValue(value?.start))
    const end = output(fromVeanDateValue(value?.end))
    return [start as any, end as any]
  }

  return output(fromVeanDateValue(value)) as string | Date | undefined
}

const showToast = (
  type: 'success' | 'warning' | 'info' | 'error',
  message: string,
  options?: MessageOptions
) => {
  const data = {
    duration: options?.duration ?? 3000,
    showClose: options?.showClose ?? true
  }

  if (type === 'success') {
    toast.success(message, data)
    return
  }
  if (type === 'warning') {
    toast.warning(message, data)
    return
  }
  if (type === 'error') {
    toast.error(message, data)
    return
  }
  toast.info(message, data)
}

const getDialogMethod = (type?: MessageBoxOptions['type']) => {
  if (type === 'success') return dialog.success
  if (type === 'warning') return dialog.warning
  if (type === 'error') return dialog.error
  return dialog.info
}

/**
 * Vean UI 适配器
 *
 * 说明：
 * - Vean 使用 xs/sm/md/lg/xl/2xl 尺寸，协议尺寸统一映射到 sm/md/lg
 * - Vean 的 Form / FormItem 基于 TanStack Form，这里按协议规则自行实现了校验层
 * - Message 使用 Vean 的 toast / dialog 命令式 API，并在首次调用时自动挂载 Provider
 */
const VeanUIAdapter: UIAdapter = {
  injectCssVars: () => {
    const style = document.documentElement.style

    style.setProperty(`--${ns('color-primary')}`, 'hsl(var(--primary, 217.2 91.2% 59.8%))')
    style.setProperty(`--${ns('color-primary-light')}`, 'hsl(var(--primary-50, 214.3 100% 96.9%))')
    style.setProperty(`--${ns('color-success')}`, 'hsl(var(--success, 142.1 76.2% 36.3%))')
    style.setProperty(`--${ns('color-success-light')}`, 'hsl(var(--success-100, 141.8 84.1% 92.7%))')
    style.setProperty(`--${ns('color-warning')}`, 'hsl(var(--warning, 37.7 92.1% 50.2%))')
    style.setProperty(`--${ns('color-danger')}`, 'hsl(var(--destructive, 0 72.2% 50.6%))')
    style.setProperty(`--${ns('color-bg')}`, 'hsl(var(--background, 0 0% 100%))')
    style.setProperty(`--${ns('color-bg-light')}`, 'hsl(var(--muted, 210 40% 96.1%))')
    style.setProperty(`--${ns('color-bg-secondary')}`, 'hsl(var(--card, 0 0% 100%))')
    style.setProperty(`--${ns('color-bg-soft')}`, 'hsl(var(--muted, 210 40% 96.1%))')
    style.setProperty(`--${ns('color-border')}`, 'hsl(var(--border, 214.3 31.8% 91.4%))')
    style.setProperty(`--${ns('color-fill-light')}`, 'hsl(var(--muted, 210 40% 96.1%))')
    style.setProperty(`--${ns('color-text-primary')}`, 'hsl(var(--foreground, 222.2 84% 4.9%))')
    style.setProperty(`--${ns('color-text-regular')}`, 'hsl(var(--foreground, 222.2 84% 4.9%))')
    style.setProperty(`--${ns('color-text-secondary')}`, 'hsl(var(--muted-foreground, 215.4 16.3% 46.9%))')
  },

  Form: defineComponent(
    (_, { slots, attrs, expose }) => {
      const propsAttrs = normalizeAttrs(attrs) as FormProtocol['props']
      const fields = new Set<FieldController>()
      const initialModel: Ref<Record<string, any>> = ref({})

      const getRulesForName = (name?: string): any[] => {
        if (!name) return []

        const rules = propsAttrs.rules
        if (!rules) return []

        if (Array.isArray(rules)) return rules

        const direct = rules[name]
        const value = direct ?? get(rules, name)
        if (!value) return []
        return Array.isArray(value) ? value : [value]
      }

      const registerField = (field: FieldController) => {
        fields.add(field)
      }

      const unregisterField = (field: FieldController) => {
        fields.delete(field)
      }

      const context: VeanFormContext = {
        get model() {
          return propsAttrs.model ?? {}
        },
        get rules() {
          return propsAttrs.rules
        },
        get labelWidth() {
          return propsAttrs.labelWidth
        },
        get labelAlign() {
          return propsAttrs.labelAlign
        },
        get inline() {
          return propsAttrs.inline
        },
        get disabled() {
          return propsAttrs.disabled
        },
        get size() {
          return propsAttrs.size
        },
        get hideRequiredAsterisk() {
          return propsAttrs.hideRequiredAsterisk
        },
        getRulesForName,
        registerField,
        unregisterField
      }

      provide(veanFormContextKey, context)

      const getSelectedFields = (names?: string | string[]): FieldController[] => {
        if (names === undefined) return Array.from(fields)

        const nameList = Array.isArray(names) ? names : [names]
        return Array.from(fields).filter((field) => {
          return field.name !== undefined && nameList.includes(field.name)
        })
      }

      const validateFields = async (names?: string | string[]): Promise<boolean> => {
        const selected = getSelectedFields(names)
        const errors: Record<string, string> = {}
        let firstInvalid: FieldController | undefined

        for (const field of selected) {
          const valid = await field.validate()
          if (valid) continue

          const name = field.name ?? ''
          errors[name] = field.getError()
          if (!firstInvalid) firstInvalid = field
        }

        if (firstInvalid) {
          if (propsAttrs.scrollToError) firstInvalid.scrollTo()
          throw errors
        }

        return true
      }

      const scrollToField = (name: string) => {
        const field = getSelectedFields(name)[0]
        field?.scrollTo()
      }

      const resetFields = (names?: string | string[]) => {
        const model = propsAttrs.model
        if (!model) return

        if (names === undefined) {
          Object.keys(model).forEach((key) => {
            unset(model, key)
          })
          Object.assign(model, cloneDeep(initialModel.value))
        } else {
          const nameList = Array.isArray(names) ? names : [names]
          nameList.forEach((name) => {
            const initialValue = cloneDeep(get(initialModel.value, name))
            if (initialValue === undefined) {
              unset(model, name)
              return
            }
            set(model, name, initialValue)
          })
        }

        getSelectedFields(names).forEach((field) => field.resetTouched())
      }

      const clearValidate = (names?: string | string[]) => {
        getSelectedFields(names).forEach((field) => field.clearValidate())
      }

      onMounted(() => {
        initialModel.value = cloneDeep(propsAttrs.model ?? {})
      })

      watch(
        () => context.rules,
        () => {
          if (!propsAttrs.validateOnRuleChange) return
          void validateFields().catch(() => undefined)
        },
        { deep: true }
      )

      expose({
        validate: () => validateFields(),
        validateField: (names: string | string[]) => validateFields(names),
        resetFields,
        scrollToField,
        clearValidate
      } satisfies FormProtocol['expose'])

      return () => {
        const forwarded = omit(attrs, [
          'model',
          'rules',
          'labelWidth',
          'labelAlign',
          'inline',
          'disabled',
          'size',
          'validateOnRuleChange',
          'hideRequiredAsterisk',
          'scrollToError',
          'colon'
        ])

        const formStyle: Record<string, any> = {}
        if (propsAttrs.inline) {
          formStyle.display = 'flex'
          formStyle.flexWrap = 'wrap'
          formStyle.alignItems = 'flex-start'
          formStyle.gap = '12px 16px'
        }
        if (propsAttrs.disabled) {
          formStyle.opacity = '0.65'
        }

        return h(
          'form',
          {
            ...forwarded,
            class: [(attrs as any).class, 'vfc-vean-form'],
            style: [(attrs as any).style, formStyle],
            novalidate: true,
            'aria-disabled': propsAttrs.disabled ? 'true' : undefined,
            onSubmit: (event: Event) => {
              event.preventDefault()
              callHandler((attrs as any).onSubmit, event)
            }
          },
          slots
        )
      }
    },
    { inheritAttrs: false }
  ),

  FormItem: defineComponent(
    (_, { slots, attrs }) => {
      const propsAttrs = normalizeAttrs(attrs) as FormItemProtocol['props']
      const form = inject(veanFormContextKey, null)
      const localError = ref(propsAttrs.error ?? '')
      const rootEl = ref<HTMLElement | null>(null)

      watch(
        () => propsAttrs.error,
        (value) => {
          localError.value = value ?? ''
        }
      )

      const getEffectiveRules = (): any[] => {
        const rules: any[] = []
        const formRules = form?.getRulesForName(propsAttrs.name)
        if (formRules) rules.push(...formRules)

        const ownRules = unref(propsAttrs.rules)
        if (Array.isArray(ownRules)) {
          rules.push(...ownRules)
        } else if (ownRules) {
          rules.push(ownRules)
        }

        if (propsAttrs.required && !hasRequiredRule(rules)) {
          rules.push({
            required: true,
            message: '该字段是必填字段',
            trigger: 'blur'
          })
        }

        return rules
      }

      const runValidation = async (trigger?: ValidationTrigger): Promise<boolean> => {
        const rules = getEffectiveRules()
        const matchedRules = rules.filter((rule) => matchesTrigger(rule, trigger))

        if (trigger && matchedRules.length === 0) {
          return localError.value.length === 0
        }

        const model = form?.model

        for (const rule of matchedRules) {
          const value = propsAttrs.name ? get(model, propsAttrs.name) : undefined
          const message = await validateRule(rule, value, model)
          if (!message) continue

          localError.value = message
          return false
        }

        localError.value = ''
        return true
      }

      const clearValidate = () => {
        localError.value = ''
      }

      const controller: FieldController = {
        get name() {
          return propsAttrs.name
        },
        validate: () => runValidation(),
        clearValidate,
        getError: () => localError.value,
        scrollTo: () => {
          rootEl.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        },
        resetTouched: clearValidate
      }

      provide(veanFormItemContextKey, {
        get name() {
          return propsAttrs.name
        },
        notifyChange: () => {
          if (!localError.value) return
          void runValidation('change')
        },
        notifyBlur: () => {
          void runValidation('blur')
        },
        validate: (trigger?: ValidationTrigger) => runValidation(trigger),
        clearValidate
      })

      onMounted(() => form?.registerField(controller))
      onBeforeUnmount(() => form?.unregisterField(controller))

      return () => {
        const labelAlign = propsAttrs.labelAlign ?? form?.labelAlign ?? 'right'
        const isTopLabel = labelAlign === 'top'
        const labelWidth = propsAttrs.labelWidth ?? form?.labelWidth
        const hasLabelSlot = Boolean(slots.label)
        const hasLabel = hasLabelSlot || (propsAttrs.label !== undefined && propsAttrs.label !== '')
        const hideLabel = labelWidth === 0 || !hasLabel
        const rules = getEffectiveRules()
        const required = hasRequiredRule(rules)
        const showRequiredMark = required && !form?.hideRequiredAsterisk

        const labelStyle: Record<string, any> = {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          textAlign: isTopLabel ? 'left' : labelAlign === 'left' ? 'left' : 'right',
          marginBottom: isTopLabel ? '5px' : undefined,
          width: isTopLabel ? '100%' : toCssWidth(labelWidth) ?? 'auto'
        }

        const labelContent = slots.label
          ? slots.label()
          : h('span', { style: { lineHeight: '1.6' } }, propsAttrs.label)

        const labelNode = hideLabel
          ? null
          : h(
              'label',
              {
                class: 'vfc-vean-form-item__label',
                style: labelStyle
              },
              [
                showRequiredMark
                  ? h(
                      'span',
                      {
                        class: 'vfc-vean-form-item__required',
                        style: { color: 'hsl(var(--destructive, 0 72.2% 50.6%))', lineHeight: '1' }
                      },
                      '*'
                    )
                  : null,
                labelContent
              ]
            )

        const showError = propsAttrs.showMessage !== false && Boolean(localError.value)
        const errorNode = showError
          ? h(
              'div',
              {
                class: 'vfc-vean-form-item__error',
                role: 'alert',
                style: {
                  color: 'hsl(var(--destructive, 0 72.2% 50.6%))',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  marginTop: '4px',
                  wordBreak: 'break-word'
                }
              },
              slots.error ? slots.error() : localError.value
            )
          : null

        const contentNode = h(
          'div',
          {
            class: 'vfc-vean-form-item__content',
            style: {
              flex: isTopLabel ? undefined : '1 1 0%',
              minWidth: 0,
              width: isTopLabel ? '100%' : undefined
            }
          },
          [slots.default?.(), errorNode]
        )

        const forwarded = omit(attrs, [
          'name',
          'label',
          'labelWidth',
          'labelAlign',
          'required',
          'rules',
          'error',
          'showMessage',
          'size'
        ])

        return h(
          'div',
          {
            ...forwarded,
            ref: (el: any) => {
              rootEl.value = el as HTMLElement | null
            },
            class: [(attrs as any).class, 'vfc-vean-form-item'],
            style: [
              (attrs as any).style,
              {
                display: isTopLabel ? 'block' : 'flex',
                alignItems: 'flex-start',
                width: form?.inline ? 'auto' : '100%',
                marginBottom: form?.inline ? '0' : '18px'
              }
            ]
          },
          [labelNode, contentNode]
        )
      }
    },
    { inheritAttrs: false }
  ),

  Input: defineComponent(
    (_, { attrs, slots }) => {
      const propsAttrs = normalizeAttrs(attrs) as InputProtocol['props']
      const form = inject(veanFormContextKey, null)
      const field = inject(veanFormItemContextKey, null)

      return () => {
        const disabled = propsAttrs.disabled ?? form?.disabled ?? false
        const modelValue = propsAttrs.modelValue ?? ''
        const updateValue = (value?: string) => {
          const next = value ?? ''
          callHandler(propsAttrs['onUpdate:modelValue'], next)
          callHandler(propsAttrs.onInput, next)
          callHandler(propsAttrs.onChange, next)
          if (propsAttrs.clearable && next === '') callHandler(propsAttrs.onClear)
          field?.notifyChange()
        }

        const hasPrepend = Boolean(slots.prepend)
        const hasAppend = Boolean(slots.append)

        // prefix / suffix 映射到 Vean 输入框内部的 leading / trailing 插槽；
        // prepend / append 则用外层 flex 容器拼接，避免把外部 addon 塞进原生输入框。
        const inputSlots: Record<string, any> = {
          leading: slots.prefix,
          trailing: slots.suffix,
          clear: slots.clear
        }

        const controlRadius: Record<string, string> = {}
        if (hasPrepend) {
          controlRadius.borderTopLeftRadius = '0'
          controlRadius.borderBottomLeftRadius = '0'
        }
        if (hasAppend) {
          controlRadius.borderTopRightRadius = '0'
          controlRadius.borderBottomRightRadius = '0'
        }

        const inputNode = h(
          SInput as any,
          {
            ...omit(attrs, [
              'modelValue',
              'onUpdate:modelValue',
              'clearable',
              'showWordLimit',
              'prefix',
              'suffix',
              'prepend',
              'append',
              'onInput',
              'onChange',
              'onClear',
              'style',
              'rootProps'
            ]),
            modelValue,
            clearable: propsAttrs.clearable,
            disabled,
            readonly: propsAttrs.readonly,
            maxlength: propsAttrs.maxlength,
            placeholder: propsAttrs.placeholder,
            size: normalizeSize(propsAttrs.size ?? form?.size),
            rootProps: {
              ...(attrs as any).rootProps,
              style: [
                (attrs as any).rootProps?.style,
                (attrs as any).style,
                hasPrepend || hasAppend
                  ? { flex: '1 1 0%', minWidth: 0, ...controlRadius }
                  : undefined
              ]
            },
            'onUpdate:modelValue': updateValue,
            onBlur: (event: Event) => callHandler(propsAttrs.onBlur, event),
            onFocus: (event: Event) => callHandler(propsAttrs.onFocus, event)
          },
          inputSlots
        )

        const countNode = propsAttrs.showWordLimit
          ? h(
              'div',
              {
                class: 'vfc-vean-input__count',
                style: {
                  color: 'hsl(var(--muted-foreground, 215.4 16.3% 46.9%))',
                  fontSize: '12px',
                  lineHeight: '1.4',
                  textAlign: 'right',
                  marginTop: '2px'
                }
              },
              `${modelValue.length}${propsAttrs.maxlength ? `/${propsAttrs.maxlength}` : ''}`
            )
          : null

        const withCount = (node: any) => {
          if (!countNode) return node
          return h('div', { style: { width: '100%' } }, [node, countNode])
        }

        if (!hasPrepend && !hasAppend) return withCount(inputNode)

        const addonRadius = 'var(--radius, 0.5rem)'

        const addonStyle = (side: 'prepend' | 'append') => ({
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          padding: '0 12px',
          color: 'hsl(var(--muted-foreground, 215.4 16.3% 46.9%))',
          background: 'hsl(var(--muted, 210 40% 96.1%))',
          border: '1px solid hsl(var(--border, 214.3 31.8% 91.4%))',
          borderRight: side === 'prepend' ? 'none' : undefined,
          borderLeft: side === 'append' ? 'none' : undefined,
          borderRadius:
            side === 'prepend'
              ? `${addonRadius} 0 0 ${addonRadius}`
              : `0 ${addonRadius} ${addonRadius} 0`,
          whiteSpace: 'nowrap',
          fontSize: '14px'
        })

        const nodes: any[] = []
        if (hasPrepend) {
          nodes.push(
            h(
              'span',
              {
                class: 'vfc-vean-input__prepend',
                style: addonStyle('prepend')
              },
              slots.prepend?.()
            )
          )
        }

        nodes.push(
          h('div', { style: { flex: '1 1 0%', minWidth: 0 } }, [inputNode])
        )

        if (hasAppend) {
          nodes.push(
            h(
              'span',
              {
                class: 'vfc-vean-input__append',
                style: addonStyle('append')
              },
              slots.append?.()
            )
          )
        }

        return withCount(
          h(
            'div',
            {
              class: 'vfc-vean-input-group',
              style: { display: 'flex', alignItems: 'stretch', width: '100%' }
            },
            nodes
          )
        )
      }
    },
    { inheritAttrs: false }
  ),

  Textarea: defineComponent(
    (_, { attrs }) => {
      const propsAttrs = normalizeAttrs(attrs) as TextareaProtocol['props']
      const form = inject(veanFormContextKey, null)
      const field = inject(veanFormItemContextKey, null)

      return () => {
        const updateValue = (value?: string) => {
          const next = value ?? ''
          callHandler(propsAttrs['onUpdate:modelValue'], next)
          callHandler(propsAttrs.onInput, next)
          callHandler(propsAttrs.onChange, next)
          field?.notifyChange()
        }

        return h(STextarea as any, {
          ...omit(attrs, [
            'modelValue',
            'onUpdate:modelValue',
            'clearable',
            'showWordLimit',
            'onInput',
            'onChange',
            'onClear'
          ]),
          modelValue: propsAttrs.modelValue ?? '',
          clearable: propsAttrs.clearable,
          showCounter: propsAttrs.showWordLimit,
          autosize: Boolean(propsAttrs.autosize),
          disabled: propsAttrs.disabled ?? form?.disabled ?? false,
          readonly: propsAttrs.readonly,
          maxlength: propsAttrs.maxlength,
          placeholder: propsAttrs.placeholder,
          size: normalizeSize(propsAttrs.size ?? form?.size),
          'onUpdate:modelValue': updateValue,
          onClear: () => {
            callHandler(propsAttrs.onClear)
            field?.notifyChange()
          },
          onBlur: (event: Event) => callHandler(propsAttrs.onBlur, event),
          onFocus: (event: Event) => callHandler(propsAttrs.onFocus, event)
        })
      }
    },
    { inheritAttrs: false }
  ),

  Select: defineComponent(
    (_, { attrs, slots }) => {
      const propsAttrs = normalizeAttrs(attrs) as SelectProtocol['props']
      const form = inject(veanFormContextKey, null)
      const field = inject(veanFormItemContextKey, null)

      return () => {
        const items = (propsAttrs.options ?? []).map((option) => ({
          label: option.label,
          value: option.value,
          disabled: option.disabled
        }))

        const updateValue = (value: any) => {
          callHandler(propsAttrs['onUpdate:modelValue'], value)
          callHandler(propsAttrs.onChange, value)
          if (propsAttrs.clearable && isEmptyValue(value)) callHandler(propsAttrs.onClear)
          field?.notifyChange()
        }

        const selectSlots: Record<string, any> = {
          'trigger-leading': slots.prefix
        }

        if (propsAttrs.loading) {
          selectSlots.top = () =>
            h(
              'div',
              {
                style: {
                  color: 'hsl(var(--muted-foreground, 215.4 16.3% 46.9%))',
                  fontSize: '12px',
                  padding: '4px 8px'
                }
              },
              '加载中...'
            )
        }

        return h(
          SSelect as any,
          {
            ...omit(attrs, [
              'modelValue',
              'onUpdate:modelValue',
              'options',
              'clearable',
              'filterable',
              'multiple',
              'loading',
              'onChange',
              'onClear'
            ]),
            items,
            modelValue: propsAttrs.modelValue ?? undefined,
            multiple: propsAttrs.multiple,
            clearable: propsAttrs.clearable ?? true,
            disabled: propsAttrs.disabled ?? form?.disabled ?? false,
            placeholder: propsAttrs.placeholder,
            size: normalizeSize(propsAttrs.size ?? form?.size),
            'onUpdate:modelValue': updateValue
          },
          selectSlots
        )
      }
    },
    { inheritAttrs: false }
  ),

  RadioGroup: defineComponent(
    (_, { attrs }) => {
      const propsAttrs = normalizeAttrs(attrs) as RadioGroupProtocol['props']
      const form = inject(veanFormContextKey, null)
      const field = inject(veanFormItemContextKey, null)

      return () => {
        const items = (propsAttrs.options ?? []).map((option) => ({
          label: option.label,
          value: option.value,
          disabled: option.disabled
        }))

        const Component = propsAttrs.isButtonOption ? SRadioGroupCard : SRadioGroup
        const updateValue = (value: any) => {
          callHandler(propsAttrs['onUpdate:modelValue'], value)
          callHandler(propsAttrs.onChange, value)
          field?.notifyChange()
        }

        return h(Component as any, {
          ...omit(attrs, ['modelValue', 'onUpdate:modelValue', 'options', 'isButtonOption']),
          items,
          modelValue: propsAttrs.modelValue ?? null,
          disabled: propsAttrs.disabled ?? form?.disabled ?? false,
          'onUpdate:modelValue': updateValue
        })
      }
    },
    { inheritAttrs: false }
  ),

  CheckboxGroup: defineComponent(
    (_, { attrs }) => {
      const propsAttrs = normalizeAttrs(attrs) as CheckboxGroupProtocol['props']
      const form = inject(veanFormContextKey, null)
      const field = inject(veanFormItemContextKey, null)

      return () => {
        const items = (propsAttrs.options ?? []).map((option) => ({
          label: option.label,
          value: option.value,
          disabled: option.disabled
        }))

        const Component = propsAttrs.isButtonOption ? SCheckboxCardGroup : SCheckboxGroup
        const updateValue = (value: any[]) => {
          callHandler(propsAttrs['onUpdate:modelValue'], value)
          callHandler(propsAttrs.onChange, value)
          field?.notifyChange()
        }

        return h(Component as any, {
          ...omit(attrs, ['modelValue', 'onUpdate:modelValue', 'options', 'isButtonOption']),
          items,
          modelValue: Array.isArray(propsAttrs.modelValue) ? propsAttrs.modelValue : [],
          disabled: propsAttrs.disabled ?? form?.disabled ?? false,
          'onUpdate:modelValue': updateValue
        })
      }
    },
    { inheritAttrs: false }
  ),

  Switch: defineComponent(
    (_, { attrs }) => {
      const propsAttrs = normalizeAttrs(attrs) as SwitchProtocol['props']
      const form = inject(veanFormContextKey, null)
      const field = inject(veanFormItemContextKey, null)

      return () => {
        const updateValue = (value: boolean) => {
          callHandler(propsAttrs['onUpdate:modelValue'], value)
          callHandler(propsAttrs.onChange, value)
          field?.notifyChange()
        }

        const checked = Boolean(propsAttrs.modelValue)

        // Vean Switch 没有 activeText / inactiveText 属性，
        // 用 leading（关闭态文案）和 trailing（打开态文案）插槽实现同等效果。
        const switchSlots: Record<string, any> = {
          leading: propsAttrs.inactiveText
            ? () => (checked ? null : h('span', { class: 'vfc-vean-switch__text' }, propsAttrs.inactiveText))
            : undefined,
          trailing: propsAttrs.activeText
            ? () => (checked ? h('span', { class: 'vfc-vean-switch__text' }, propsAttrs.activeText) : null)
            : undefined
        }

        return h(
          SSwitch as any,
          {
            ...omit(attrs, [
              'modelValue',
              'model-value',
              'onUpdate:modelValue',
              'loading',
              'activeText',
              'active-text',
              'inactiveText',
              'inactive-text',
              'onChange'
            ]),
            modelValue: checked,
            disabled: propsAttrs.disabled ?? form?.disabled ?? false,
            style: [{ opacity: propsAttrs.loading ? '0.6' : undefined }, (attrs as any).style],
            'onUpdate:modelValue': updateValue
          },
          switchSlots
        )
      }
    },
    { inheritAttrs: false }
  ),

  InputNumber: defineComponent(
    (_, { attrs }) => {
      const propsAttrs = normalizeAttrs(attrs) as InputNumberProtocol['props']
      const form = inject(veanFormContextKey, null)
      const field = inject(veanFormItemContextKey, null)

      return () => {
        const updateValue = (value: number | null) => {
          const next = value === null ? undefined : value
          callHandler(propsAttrs['onUpdate:modelValue'], next)
          if (next !== undefined) callHandler(propsAttrs.onChange, next)
          field?.notifyChange()
        }

        return h(SInputNumber as any, {
          ...omit(attrs, ['modelValue', 'onUpdate:modelValue', 'onChange']),
          modelValue: propsAttrs.modelValue ?? null,
          min: propsAttrs.min,
          max: propsAttrs.max,
          step: propsAttrs.step,
          disabled: propsAttrs.disabled ?? form?.disabled ?? false,
          size: normalizeSize(form?.size),
          style: [{ width: '100%' }, (attrs as any).style],
          'onUpdate:modelValue': updateValue
        })
      }
    },
    { inheritAttrs: false }
  ),

  Slider: defineComponent(
    (_, { attrs }) => {
      const propsAttrs = normalizeAttrs(attrs) as SliderProtocol['props']
      const form = inject(veanFormContextKey, null)
      const field = inject(veanFormItemContextKey, null)

      return () => {
        const updateValue = (value: number[]) => {
          const next = fromSliderValue(value, propsAttrs.range)
          if (next === undefined) return
          callHandler(propsAttrs['onUpdate:modelValue'], next)
          callHandler(propsAttrs.onChange, next)
          field?.notifyChange()
        }

        const sliderAttrs: Record<string, any> = {
          ...omit(attrs, [
            'modelValue',
            'onUpdate:modelValue',
            'range',
            'min',
            'max',
            'step',
            'onChange'
          ]),
          min: propsAttrs.min,
          max: propsAttrs.max,
          step: propsAttrs.step,
          disabled: propsAttrs.disabled ?? form?.disabled ?? false,
          'onUpdate:modelValue': updateValue
        }

        // Vean 的受控 Slider 在 modelValue 为空数组时会立即回调 0，
        // 导致未传值的表单字段（如透明度）被意外写成 0。
        // 未传入 modelValue 时改用 defaultValue，等外部赋值后再切换为受控模式。
        if (propsAttrs.modelValue === undefined || propsAttrs.modelValue === null) {
          sliderAttrs.defaultValue = propsAttrs.range
            ? [propsAttrs.min ?? 0, propsAttrs.max ?? 100]
            : [propsAttrs.min ?? 0]
        } else {
          sliderAttrs.modelValue = toSliderValue(propsAttrs.modelValue, propsAttrs.range)
        }

        return h(SSlider as any, sliderAttrs)
      }
    },
    { inheritAttrs: false }
  ),

  Rate: defineComponent(
    (_, { attrs }) => {
      const propsAttrs = normalizeAttrs(attrs) as RateProtocol['props']
      const form = inject(veanFormContextKey, null)
      const field = inject(veanFormItemContextKey, null)

      return () => {
        const updateValue = (value: number) => {
          callHandler(propsAttrs['onUpdate:modelValue'], value)
          callHandler(propsAttrs.onChange, value)
          field?.notifyChange()
        }

        let scoreText: string | undefined
        if (propsAttrs.showScore) scoreText = String(propsAttrs.modelValue ?? 0)
        if (propsAttrs.showText) scoreText = `${propsAttrs.modelValue ?? 0} 分`

        return h(
          'div',
          {
            class: 'vfc-vean-rate',
            style: { display: 'inline-flex', alignItems: 'center', gap: '8px' }
          },
          [
            h(SRating as any, {
              ...omit(attrs, [
                'modelValue',
                'onUpdate:modelValue',
                'max',
                'showScore',
                'showText',
                'onChange'
              ]),
              modelValue: propsAttrs.modelValue ?? 0,
              max: propsAttrs.max,
              allowHalf: propsAttrs.allowHalf,
              disabled: propsAttrs.disabled ?? form?.disabled ?? false,
              color: 'warning',
              'onUpdate:modelValue': updateValue
            }),
            scoreText
              ? h(
                  'span',
                  {
                    class: 'vfc-vean-rate__text',
                    style: { color: 'hsl(var(--muted-foreground, 215.4 16.3% 46.9%))', fontSize: '13px' }
                  },
                  scoreText
                )
              : null
          ]
        )
      }
    },
    { inheritAttrs: false }
  ),

  ColorPicker: defineComponent(
    (_, { attrs }) => {
      const propsAttrs = normalizeAttrs(attrs) as ColorPickerProtocol['props']
      const form = inject(veanFormContextKey, null)
      const field = inject(veanFormItemContextKey, null)

      return () => {
        const updateValue = (value: string) => {
          callHandler(propsAttrs['onUpdate:modelValue'], value)
          callHandler(propsAttrs.onActiveChange, value)
          field?.notifyChange()
        }

        return h(SColorPicker as any, {
          ...omit(attrs, [
            'modelValue',
            'onUpdate:modelValue',
            'showAlpha',
            'colorFormat',
            'onChange',
            'onActiveChange'
          ]),
          modelValue: propsAttrs.modelValue || undefined,
          disabled: propsAttrs.disabled ?? form?.disabled ?? false,
          showAlpha: propsAttrs.showAlpha !== false,
          format: normalizeColorFormat(propsAttrs.colorFormat),
          'onUpdate:modelValue': updateValue,
          onChange: (value: string) => callHandler(propsAttrs.onChange, value)
        })
      }
    },
    { inheritAttrs: false }
  ),

  DatePicker: defineComponent(
    (_, { attrs }) => {
      const propsAttrs = normalizeAttrs(attrs) as DatePickerProtocol['props']
      const form = inject(veanFormContextKey, null)
      const field = inject(veanFormItemContextKey, null)

      return () => {
        const type = propsAttrs.type ?? 'date'
        const isRange =
          type === 'daterange' || type === 'monthrange' || type === 'datetimerange'
        const granularity: DateGranularity =
          type === 'datetime' || type === 'datetimerange' ? 'minute' : 'day'

        const updateValue = (value: any) => {
          const next = fromVeanPickerValue(value, isRange, propsAttrs.valueFormat)
          callHandler(propsAttrs['onUpdate:modelValue'], next as any)
          callHandler(propsAttrs.onChange, next as any)
          field?.notifyChange()
        }

        const PickerComponent = isRange ? SDateRangePicker : SDatePicker

        return h(PickerComponent as any, {
          ...omit(attrs, [
            'modelValue',
            'onUpdate:modelValue',
            'type',
            'placeholder',
            'startPlaceholder',
            'endPlaceholder',
            'clearable',
            'format',
            'valueFormat',
            'disabledDate',
            'onChange'
          ]),
          modelValue: toVeanPickerValue(
            propsAttrs.modelValue,
            isRange,
            granularity,
            propsAttrs.valueFormat
          ),
          disabled: propsAttrs.disabled ?? form?.disabled ?? false,
          readonly: (attrs as any).readonly,
          size: normalizeSize(form?.size),
          dateFieldProps: { granularity },
          isDateUnavailable: propsAttrs.disabledDate,
          'onUpdate:modelValue': updateValue
        })
      }
    },
    { inheritAttrs: false }
  ),

  Cascader: defineComponent(
    (_, { attrs }) => {
      const propsAttrs = normalizeAttrs(attrs) as CascaderProtocol['props']
      const form = inject(veanFormContextKey, null)
      const field = inject(veanFormItemContextKey, null)

      return () => {
        const updateValue = (value: any) => {
          callHandler(propsAttrs['onUpdate:modelValue'], value)
          callHandler(propsAttrs.onChange, value)
          if (propsAttrs.clearable && isEmptyValue(value)) callHandler(propsAttrs.onClear)
          field?.notifyChange()
        }

        return h(SCascader as any, {
          ...omit(attrs, [
            'modelValue',
            'onUpdate:modelValue',
            'options',
            'clearable',
            'filterable',
            'multiple',
            'loading',
            'onChange',
            'onClear'
          ]),
          options: propsAttrs.options ?? [],
          modelValue: propsAttrs.modelValue,
          multiple: propsAttrs.multiple,
          clearable: propsAttrs.clearable,
          filterable: propsAttrs.filterable,
          disabled: propsAttrs.disabled ?? form?.disabled ?? false,
          placeholder: propsAttrs.placeholder,
          size: normalizeSize(propsAttrs.size ?? form?.size),
          style: [
            propsAttrs.loading
              ? { opacity: '0.6', pointerEvents: 'none' }
              : undefined,
            (attrs as any).style
          ],
          'onUpdate:modelValue': updateValue
        })
      }
    },
    { inheritAttrs: false }
  ),

  Card: defineComponent(
    (_, { attrs, slots }) => {
      const propsAttrs = normalizeAttrs(attrs) as CardProtocol['props']

      return () => {
        let shadowClass: string | undefined
        if (propsAttrs.shadow === 'never') shadowClass = 'shadow-none'
        if (propsAttrs.shadow === 'hover') shadowClass = 'transition-shadow hover:shadow-md'

        const cardSlots: Record<string, any> = {
          ...slots
        }

        if (!slots.header && propsAttrs.header) {
          cardSlots.title = () => propsAttrs.header
        }

        return h(
          SCard as any,
          {
            ...omit(attrs, ['header', 'shadow', 'bodyStyle']),
            title: propsAttrs.header,
            split: Boolean(slots.header || propsAttrs.header),
            class: [(attrs as any).class, shadowClass],
            contentProps: {
              ...(attrs as any).contentProps,
              style: [(attrs as any).contentProps?.style, propsAttrs.bodyStyle]
            }
          },
          cardSlots
        )
      }
    },
    { inheritAttrs: false }
  ),

  Divider: defineComponent(
    (_, { attrs, slots }) => {
      const propsAttrs = normalizeAttrs(attrs) as DividerProtocol['props']

      return () => {
        let align: 'start' | 'center' | 'end' = 'center'
        if (propsAttrs.contentPosition === 'left') align = 'start'
        if (propsAttrs.contentPosition === 'right') align = 'end'

        const orientation = propsAttrs.direction === 'vertical' ? 'vertical' : 'horizontal'

        return h(
          SSeparator as any,
          {
            ...omit(attrs, ['direction', 'contentPosition', 'borderStyle']),
            orientation,
            align,
            border: propsAttrs.borderStyle ?? 'solid',
            // Vean 的 Separator 本身不带外边距，这里补齐 Element Plus Divider 的默认间距，
            // 避免分隔线与相邻表单项贴在一起。
            style: [
              orientation === 'vertical'
                ? { margin: '0 8px', flexShrink: 0 }
                : { margin: '24px 0' },
              (attrs as any).style
            ]
          },
          slots
        )
      }
    },
    { inheritAttrs: false }
  ),

  Tabs: defineComponent(
    (_, { attrs, slots }) => {
      const propsAttrs = normalizeAttrs(attrs) as TabsProtocol['props']

      return () => {
        const sourceItems = getTabsItems(slots.default?.() ?? [])
        const items = sourceItems.map((item) => {
          return {
            ...item,
            label: typeof item.label === 'string' ? item.label : String(item.value)
          }
        })

        const updateValue = (value: any) => {
          callHandler(propsAttrs['onUpdate:modelValue'], value)
          callHandler(propsAttrs.onTabChange, value)
        }

        const useIndicator = propsAttrs.type !== 'card' && propsAttrs.type !== 'border-card'
        const isVertical = propsAttrs.tabPosition === 'left' || propsAttrs.tabPosition === 'right'

        return h(
          STabs as any,
          {
            ...omit(attrs, [
              'modelValue',
              'onUpdate:modelValue',
              'type',
              'closable',
              'addable',
              'editable',
              'tabPosition',
              'stretch',
              'onTabClick',
              'onTabChange',
              'onTabRemove',
              'onTabAdd'
            ]),
            items,
            modelValue: propsAttrs.modelValue,
            orientation: isVertical ? 'vertical' : 'horizontal',
            fill: propsAttrs.stretch === false ? 'auto' : 'full',
            shape: 'square',
            enableIndicator: useIndicator,
            unmountOnHide: false,
            size: normalizeSize((attrs as any).size),
            'onUpdate:modelValue': updateValue
          },
          {
            trigger: (scope: any) => scope.renderLabel?.() ?? scope.label,
            content: (scope: any) => scope.render?.()
          }
        )
      }
    },
    { inheritAttrs: false }
  ),

  TabPane: defineComponent(
    (_, { attrs, slots }) => {
      return () =>
        h(
          'div',
          {
            class: [(attrs as any).class, 'vfc-vean-tab-pane'],
            style: (attrs as any).style
          },
          slots.default?.()
        )
    },
    { inheritAttrs: false }
  ),

  Collapse: defineComponent(
    (_, { attrs, slots }) => {
      const propsAttrs = normalizeAttrs(attrs) as CollapseProtocol['props']

      return () => {
        const sourceItems = getCollapseItems(slots.default?.() ?? [])
        const multiple = !propsAttrs.accordion

        let modelValue: string | string[] | undefined
        if (multiple) {
          if (Array.isArray(propsAttrs.modelValue)) {
            modelValue = propsAttrs.modelValue.map((value) => String(value))
          } else if (propsAttrs.modelValue !== undefined) {
            modelValue = [String(propsAttrs.modelValue)]
          } else {
            modelValue = []
          }
        } else if (Array.isArray(propsAttrs.modelValue)) {
          modelValue = propsAttrs.modelValue[0] === undefined
            ? undefined
            : String(propsAttrs.modelValue[0])
        } else {
          modelValue = propsAttrs.modelValue === undefined
            ? undefined
            : String(propsAttrs.modelValue)
        }

        const items = sourceItems.map((item) => {
          return {
            ...item,
            value: String(item.value),
            title: typeof item.title === 'string' ? item.title : String(item.value)
          }
        })

        const itemValueMap = new Map<string, string | number>()
        sourceItems.forEach((item) => itemValueMap.set(String(item.value), item.value as string | number))

        const resolveValue = (value: any): string | number | Array<string | number> => {
          if (Array.isArray(value)) {
            return value.map((item) => itemValueMap.get(String(item)) ?? item)
          }
          return itemValueMap.get(String(value)) ?? value
        }

        const updateValue = (value: any) => {
          const next = resolveValue(value)
          callHandler(propsAttrs['onUpdate:modelValue'], next)
          callHandler(propsAttrs.onChange, next)
        }

        return h(
          SAccordion as any,
          {
            ...omit(attrs, [
              'modelValue',
              'onUpdate:modelValue',
              'accordion',
              'onChange'
            ]),
            items,
            modelValue,
            multiple,
            collapsible: true,
            unmountOnHide: false,
            'onUpdate:modelValue': updateValue
          },
          {
            title: (scope: any) => scope.item.renderTitle?.(),
            content: (scope: any) => scope.item.render?.()
          }
        )
      }
    },
    { inheritAttrs: false }
  ),

  CollapseItem: defineComponent(
    (_, { attrs, slots }) => {
      return () =>
        h(
          'div',
          {
            class: [(attrs as any).class, 'vfc-vean-collapse-item'],
            style: (attrs as any).style
          },
          slots.default?.()
        )
    },
    { inheritAttrs: false }
  ),

  Button: defineComponent(
    (_, { attrs, slots }) => {
      const propsAttrs = normalizeAttrs(attrs) as ButtonProtocol['props']

      return () => {
        const appearance = getButtonAppearance(propsAttrs)

        return h(
          SButtonLoading as any,
          {
            ...omit(attrs, [
              'type',
              'size',
              'disabled',
              'loading',
              'plain',
              'round',
              'circle',
              'text',
              'link',
              'icon',
              'onClick'
            ]),
            type: 'button',
            color: appearance.color,
            variant: appearance.variant,
            shape: getButtonShape(propsAttrs.circle, propsAttrs.round),
            size: normalizeSize(propsAttrs.size),
            disabled: propsAttrs.disabled,
            loading: propsAttrs.loading,
            name: propsAttrs.name,
            onClick: (event: Event) => callHandler(propsAttrs.onClick, event)
          },
          {
            leading: propsAttrs.icon
              ? () => h(Icon, { name: propsAttrs.icon! })
              : undefined,
            default: slots.default
          }
        )
      }
    },
    { inheritAttrs: false }
  ),

  Modal: defineComponent(
    (_, { attrs, slots }) => {
      const propsAttrs = normalizeAttrs(attrs) as ModalProtocol['props']

      const notifyOpen = () => {
        callHandler(propsAttrs.onOpen)
        void nextTick(() => {
          callHandler(propsAttrs.onOpened)
        })
      }

      const notifyClose = () => {
        callHandler(propsAttrs.onClose)
        void nextTick(() => {
          callHandler(propsAttrs.onClosed)
        })
      }

      return () => {
        const forwarded = omit(attrs, [
          'modelValue',
          'onUpdate:modelValue',
          'title',
          'width',
          'fullscreen',
          'top',
          'modal',
          'to',
          'lockScroll',
          'closeOnClickModal',
          'closeOnPressEscape',
          'showClose',
          'center',
          'destroyOnClose',
          'draggable',
          'onOpen',
          'onOpened',
          'onClose',
          'onClosed'
        ])

        const popupStyle: Record<string, any> = {
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto'
        }
        const width = toCssWidth(propsAttrs.width)
        if (width) {
          popupStyle.width = width
          popupStyle.maxWidth = 'calc(100vw - 32px)'
        }
        if (propsAttrs.top) popupStyle.marginTop = propsAttrs.top

        const dialogSlots: Record<string, any> = {
          ...slots
        }
        if (!slots.header && propsAttrs.title !== undefined) {
          dialogSlots.title = () => propsAttrs.title
        }
        if (propsAttrs.destroyOnClose) {
          dialogSlots.default = () => (propsAttrs.modelValue ? slots.default?.() : null)
        }

        return h(
          SDialog as any,
          {
            ...forwarded,
            open: Boolean(propsAttrs.modelValue),
            title: propsAttrs.title,
            fullscreen: propsAttrs.fullscreen,
            modal: propsAttrs.modal === false ? false : true,
            showClose: propsAttrs.showClose !== false,
            showFullscreen: false,
            showCancel: false,
            showConfirm: false,
            draggable: propsAttrs.draggable,
            portalProps: propsAttrs.modelValue
              ? { to: resolveTeleportTarget(propsAttrs.to) }
              : undefined,
            popupProps: {
              ...(attrs as any).popupProps,
              style: [(attrs as any).popupProps?.style, popupStyle]
            },
            'onUpdate:open': (open: boolean) => {
              callHandler(propsAttrs['onUpdate:modelValue'], open)
              if (open) {
                notifyOpen()
                return
              }
              notifyClose()
            },
            onInteractOutside: (event: any) => {
              if (propsAttrs.closeOnClickModal === false) event.preventDefault()
            },
            onEscapeKeyDown: (event: any) => {
              if (propsAttrs.closeOnPressEscape === false) event.preventDefault()
            }
          },
          dialogSlots
        )
      }
    },
    { inheritAttrs: false }
  ),

  Alert: defineComponent(
    (_, { attrs }) => {
      const propsAttrs = normalizeAttrs(attrs) as AlertProtocol['props']

      return () =>
        h(
          SAlert as any,
          {
            ...omit(attrs, ['title', 'description', 'type', 'closable', 'showIcon', 'onClose']),
            title: propsAttrs.title,
            description: propsAttrs.description,
            color: mapAlertColor(propsAttrs.type),
            variant: 'soft',
            icon: propsAttrs.showIcon ? mapAlertIcon(propsAttrs.type) : undefined,
            closable: propsAttrs.closable,
            onClose: () => callHandler(propsAttrs.onClose)
          }
        )
    },
    { inheritAttrs: false }
  ),

  Tooltip: defineComponent(
    (_, { attrs, slots }) => {
      const propsAttrs = normalizeAttrs(attrs) as TooltipProtocol['props']

      return () => {
        return h(
          STooltip as any,
          {
            ...omit(attrs, [
              'content',
              'visible',
              'effect',
              'offset',
              'showArrow',
              'trigger'
            ]),
            content: propsAttrs.content,
            open: propsAttrs.disabled ? false : propsAttrs.visible,
            disabled: propsAttrs.disabled,
            placement: normalizeTooltipPlacement(propsAttrs.placement),
            showArrow: propsAttrs.showArrow !== false
          },
          {
            trigger: slots.default,
            default: slots.content
          }
        )
      }
    },
    { inheritAttrs: false }
  ),

  Tag: defineComponent(
    (_, { attrs, slots }) => {
      const propsAttrs = normalizeAttrs(attrs) as TagProtocol['props']
      const open = ref(true)

      return () => {
        let variant: 'solid' | 'soft' | 'outline' = 'soft'
        if (propsAttrs.effect === 'dark') variant = 'solid'
        if (propsAttrs.effect === 'plain') variant = 'outline'

        let customStyle: Record<string, any> | undefined
        if (propsAttrs.color) {
          if (propsAttrs.effect === 'dark') {
            customStyle = {
              backgroundColor: propsAttrs.color,
              borderColor: propsAttrs.color,
              color: '#fff'
            }
          } else {
            customStyle = {
              borderColor: propsAttrs.color,
              color: propsAttrs.color
            }
          }
        }

        if (!open.value) return null

        return h(
          STag as any,
          {
            ...omit(attrs, ['type', 'closable', 'size', 'effect', 'round', 'color', 'onClose']),
            content: undefined,
            color: propsAttrs.color ? undefined : mapThemeColor(propsAttrs.type),
            variant,
            shape: propsAttrs.round ? 'rounded' : 'auto',
            size: normalizeSize(propsAttrs.size),
            closable: propsAttrs.closable,
            open: open.value,
            style: [(attrs as any).style, customStyle],
            'onUpdate:open': (value: boolean) => {
              open.value = value
              if (!value) callHandler(propsAttrs.onClose)
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
      showToast('success', message, options)
    },
    warning: (message: string, options?: MessageOptions) => {
      showToast('warning', message, options)
    },
    info: (message: string, options?: MessageOptions) => {
      showToast('info', message, options)
    },
    error: (message: string | MessageOptions, options?: MessageOptions) => {
      if (typeof message === 'string') {
        showToast('error', message, options)
        return
      }
      showToast('error', message.message ?? '', message)
    },
    confirm: (message: string, title?: string, options?: MessageBoxOptions): Promise<void> => {
      // 命令式 dialog 固定为 alert 模式，只有 warning 类型默认显示取消按钮
      const showCancel = options?.showCancelButton !== false
      const method = showCancel ? dialog.warning : getDialogMethod(options?.type)

      return new Promise((resolve, reject) => {
        method(title || '提示', {
          content: h('div', { style: { lineHeight: '1.6' } }, message),
          cancelText: showCancel ? options?.cancelButtonText || '取消' : undefined,
          confirmText: options?.confirmButtonText || '确定',
          onConfirm: () => resolve(),
          onCancel: () => reject('cancel'),
          onDismiss: () => reject('cancel')
        })
      })
    },
    alert: (message: string, title?: string, options?: MessageBoxOptions): Promise<void> => {
      const method = getDialogMethod(options?.type ?? 'info')

      return new Promise((resolve, reject) => {
        method(title || '提示', {
          content: h('div', { style: { lineHeight: '1.6' } }, message),
          showCancel: false,
          showConfirm: options?.showConfirmButton !== false,
          confirmText: options?.confirmButtonText || '确定',
          onConfirm: () => resolve(),
          onDismiss: () => reject('cancel')
        })
      })
    }
  }
}

export default VeanUIAdapter
