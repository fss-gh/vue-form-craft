import type { FormItemRule } from 'element-plus'
import type { RuleItem } from '@/types'
import { normalizeRules } from '@/validation/normalizeRules'

/**
 * 解析表单规则为 Element Plus / async-validator 兼容的规则数组
 *
 * 规则归一化逻辑位于 `@/validation/normalizeRules`，
 * 这里仅负责把与 UI 无关的 NormalizedRule 转成 Element Plus 类型。
 *
 * @param rules 规则配置数组
 * @param fieldName 当前字段名（用于错误定位）
 * @returns Element Plus 兼容的规则数组
 */
export function parseRules(rules?: RuleItem[], fieldName?: string): FormItemRule[] {
  return normalizeRules(rules, fieldName) as unknown as FormItemRule[]
}
