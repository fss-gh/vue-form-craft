import { get } from 'lodash'
import { computed, ref } from 'vue'
import { validate as runVeeValidation, type GenericValidateFunction } from 'vee-validate'
import { matchesTrigger, normalizeValidationError, validateNormalizedRule } from './evaluateRule'
import type {
  NormalizedRule,
  ValidationTrigger,
  VeeValidationContext,
  VeeValidationFieldController
} from './types'

type VeeFieldOptions = {
  name: () => string | undefined
  rules: () => NormalizedRule[]
  getValues: () => Record<string, any>
  scrollTo?: () => void
}

const normalizeNames = (names?: string | string[]): string[] | undefined => {
  if (names === undefined) return undefined
  return Array.isArray(names) ? names : [names]
}

/**
 * 创建 VeeValidate 字段控制器
 *
 * 字段值仍然来自 FormRender 的 formValues，不额外维护第二份表单状态；
 * 每次校验时按 trigger 过滤规则，再交给 VeeValidate 执行。
 */
export const createVeeFieldController = (
  options: VeeFieldOptions
): VeeValidationFieldController => {
  const error = ref('')
  let validationId = 0

  const validate = async (trigger?: ValidationTrigger | 'submit'): Promise<string> => {
    const name = options.name()
    const allRules = options.rules()
    const rules =
      trigger && trigger !== 'submit'
        ? allRules.filter((rule) => matchesTrigger(rule, trigger))
        : allRules

    // 没有命中当前触发器的规则时，保留上一次错误（与现有 UI 行为一致）
    if (trigger && trigger !== 'submit' && rules.length === 0) {
      return error.value
    }

    if (rules.length === 0) {
      error.value = ''
      return ''
    }

    const values = options.getValues()
    const value = name ? get(values, name) : undefined

    const validators: GenericValidateFunction[] = rules.map((rule) => async (val, ctx) => {
      const model = (ctx?.form as Record<string, any> | undefined) ?? values
      const message = await validateNormalizedRule(rule, val, model)
      return message || true
    })

    const id = ++validationId

    try {
      const result = await runVeeValidation(value, validators, {
        name,
        values,
        bails: true
      })
      const message = result.errors[0] ?? ''

      // 快速连续输入时只让最后一次校验结果更新 UI
      if (id === validationId) {
        error.value = message
      }

      return message
    } catch (validationError) {
      const message = normalizeValidationError(validationError, '校验不通过') || '校验不通过'
      if (id === validationId) {
        error.value = message
      }
      return message
    }
  }

  return {
    getName: options.name,
    getRules: options.rules,
    validate,
    clearValidate: () => {
      validationId++
      error.value = ''
    },
    getError: () => error.value,
    scrollTo: () => options.scrollTo?.()
  }
}

type VeeContextOptions = {
  getValues: () => Record<string, any>
  isEnabled: () => boolean
  scrollToError: () => boolean
}

/**
 * 创建 VeeValidate 表单级校验上下文
 *
 * 字段通过 registerField 注册；提交/重置/清空错误都由这里统一调度。
 */
export const createVeeValidationContext = (
  options: VeeContextOptions
): VeeValidationContext => {
  const fields = new Set<VeeValidationFieldController>()

  const getFields = (names?: string | string[]): VeeValidationFieldController[] => {
    const nameList = normalizeNames(names)
    const allFields = [...fields]

    if (!nameList) return allFields

    return allFields.filter((field) => {
      const name = field.getName()
      return name !== undefined && nameList.includes(name)
    })
  }

  const runValidation = async (names?: string | string[]): Promise<boolean> => {
    const errors: Record<string, string> = {}
    let firstInvalid: VeeValidationFieldController | undefined

    for (const field of getFields(names)) {
      const name = field.getName()
      if (!name) continue

      const message = await field.validate('submit')
      if (!message) continue

      errors[name] = message
      if (!firstInvalid) {
        firstInvalid = field
      }
    }

    if (firstInvalid) {
      if (options.scrollToError()) {
        firstInvalid.scrollTo()
      }
      throw errors
    }

    return true
  }

  return {
    enabled: computed(options.isEnabled),
    registerField: (field) => {
      fields.add(field)
    },
    unregisterField: (field) => {
      fields.delete(field)
    },
    validate: (names) => runValidation(names),
    validateField: (names) => runValidation(names),
    resetFields: (names) => {
      getFields(names).forEach((field) => field.clearValidate())
    },
    clearValidate: (names) => {
      getFields(names).forEach((field) => field.clearValidate())
    },
    scrollToField: (name) => {
      getFields(name)[0]?.scrollTo()
    }
  }
}
