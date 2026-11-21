import type { ComputedRef } from 'vue'

export type ValidationEngineName = 'native' | 'vee-validate'

export type ValidationTrigger = 'blur' | 'change'

/** 单条规则的执行结果回调，兼容 async-validator 的 callback 风格 */
export type RuleValidationCallback = (error?: Error | string) => void

/**
 * 规则校验函数
 *
 * 为了兼容现有 schema 中 `type: 'custom'` 的 callback 写法，
 * 参数顺序保持 `(rule, value, callback, source, options)`。
 */
export type RuleValidator = (
  rule: NormalizedRule,
  value: any,
  callback: RuleValidationCallback,
  source?: Record<string, any>,
  options?: Record<string, any>
) => void | Promise<void> | boolean | string | Error | any[]

/**
 * 与 UI 库解耦的规则结构
 *
 * 字段语义与 async-validator / Element Plus 的 FormItemRule 保持兼容，
 * 这样 native 引擎可以直接把 NormalizedRule 交给各 UI 库使用。
 */
export type NormalizedRule = {
  message: string
  trigger: ValidationTrigger | ValidationTrigger[]
  required?: boolean
  min?: number
  max?: number
  len?: number
  pattern?: RegExp
  enum?: any[]
  type?: string
  whitespace?: boolean
  validator?: RuleValidator
}

/** VeeValidate 引擎中单个字段的控制器 */
export interface VeeValidationFieldController {
  getName: () => string | undefined
  getRules: () => NormalizedRule[]
  validate: (trigger?: ValidationTrigger | 'submit') => Promise<string>
  clearValidate: () => void
  getError: () => string
  scrollTo: () => void
}

/** VeeValidate 引擎上下文，由 FormRender 提供、FormItem 注册字段 */
export interface VeeValidationContext {
  /** 当前表单是否启用 VeeValidate 引擎 */
  enabled: ComputedRef<boolean>
  registerField: (field: VeeValidationFieldController) => void
  unregisterField: (field: VeeValidationFieldController) => void
  validate: (names?: string | string[]) => Promise<boolean>
  validateField: (names: string | string[]) => Promise<boolean>
  resetFields: (names?: string | string[]) => void
  clearValidate: (names?: string | string[]) => void
  scrollToField: (name: string) => void
}
