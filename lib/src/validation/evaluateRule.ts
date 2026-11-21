import type { NormalizedRule, ValidationTrigger } from './types'

export const isEmptyValue = (value: any): boolean => {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

export const matchesTrigger = (rule: NormalizedRule, trigger?: ValidationTrigger): boolean => {
  if (!trigger) return true

  const ruleTrigger = rule.trigger
  if (!ruleTrigger) return true
  if (Array.isArray(ruleTrigger)) return ruleTrigger.includes(trigger)
  return ruleTrigger === trigger
}

export const hasRequiredRule = (rules: NormalizedRule[]): boolean => {
  return rules.some((rule) => rule?.required === true || rule?.type === 'required')
}

export const resolveRuleMessage = (rule: NormalizedRule, fallback = '校验不通过'): string => {
  const message = (rule as any)?.message
  const resolved = typeof message === 'function' ? message() : message
  if (typeof resolved === 'string' && resolved.length > 0) return resolved
  return fallback
}

export const normalizeValidationError = (error: any, fallback: string): string => {
  if (error === undefined || error === null || error === false) return ''
  if (typeof error === 'string') return error || fallback
  if (error instanceof Error) return error.message || fallback
  if (Array.isArray(error)) {
    const first = error[0]
    return normalizeValidationError(first, fallback)
  }
  if (typeof error?.message === 'string') return error.message || fallback
  return fallback
}

const runCustomValidator = (rule: NormalizedRule, value: any, model?: Record<string, any>) => {
  return new Promise<void>((resolve, reject) => {
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
      const result = rule.validator?.(rule, value, done, {}, model)

      if (result && typeof (result as Promise<void>).then === 'function') {
        ;(result as Promise<void>).then(
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
        done(
          result === false
            ? new Error(resolveRuleMessage(rule))
            : undefined
        )
      }
    } catch (error) {
      done(error)
    }
  })
}

/**
 * 校验单条已归一化的规则
 *
 * 返回空字符串表示通过，否则返回错误文案。
 * 该实现保持与 async-validator / Element Plus 现有行为兼容，
 * native 与 VeeValidate 两种引擎共用同一套规则语义。
 */
export const validateNormalizedRule = async (
  rule: NormalizedRule,
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
  if (type === 'method' && typeof value !== 'function') return fallback
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
    if (rule.pattern instanceof RegExp && !rule.pattern.test(String(value))) return fallback
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
