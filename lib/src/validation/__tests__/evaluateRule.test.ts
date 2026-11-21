import { describe, expect, it } from 'vitest'
import { matchesTrigger, validateNormalizedRule } from '../evaluateRule'
import { normalizeRules } from '../normalizeRules'
import type { NormalizedRule } from '../types'

const rule = (overrides: Partial<NormalizedRule>): NormalizedRule => ({
  message: '校验不通过',
  trigger: 'blur',
  ...overrides
})

describe('normalizeRules', () => {
  it('归一化后不包含 UI 库特有的必需字段', () => {
    const rules = normalizeRules([
      { type: 'required', message: '必填' },
      { type: 'min', value: 3, message: '至少 3 位', trigger: 'change' }
    ])

    expect(rules).toHaveLength(2)
    expect(rules[0]).toMatchObject({ required: true, message: '必填', trigger: 'blur' })
    expect(rules[1]).toMatchObject({ min: 3, message: '至少 3 位', trigger: 'change' })
  })

  it('enum 字符串会按行拆分为数组', () => {
    const [normalized] = normalizeRules([{ type: 'enum', value: 'a\n b\n\nc' }])
    expect(normalized.enum).toEqual(['a', 'b', 'c'])
  })
})

describe('validateNormalizedRule', () => {
  it('required 对空字符串、空数组、null 生效，对 0 / false 放行', async () => {
    const required = rule({ required: true, message: '必填' })

    await expect(validateNormalizedRule(required, '')).resolves.toBe('必填')
    await expect(validateNormalizedRule(required, [])).resolves.toBe('必填')
    await expect(validateNormalizedRule(required, null)).resolves.toBe('必填')
    await expect(validateNormalizedRule(required, 0)).resolves.toBe('')
    await expect(validateNormalizedRule(required, false)).resolves.toBe('')
  })

  it('非必填字段为空时跳过其他规则', async () => {
    const min = rule({ min: 3, message: '至少 3 位' })
    await expect(validateNormalizedRule(min, '')).resolves.toBe('')
  })

  it('min/max 对字符串和数组使用长度，对数字使用数值', async () => {
    const min = rule({ min: 3, message: '太小' })
    const max = rule({ max: 5, message: '太大' })

    await expect(validateNormalizedRule(min, 'ab')).resolves.toBe('太小')
    await expect(validateNormalizedRule(min, 'abc')).resolves.toBe('')
    await expect(validateNormalizedRule(min, 2)).resolves.toBe('太小')
    await expect(validateNormalizedRule(max, [1, 2, 3, 4, 5, 6])).resolves.toBe('太大')
  })

  it('pattern / enum 生效', async () => {
    await expect(
      validateNormalizedRule(rule({ pattern: /^\d+$/, message: '只能数字' }), 'abc')
    ).resolves.toBe('只能数字')
    await expect(
      validateNormalizedRule(rule({ enum: ['a', 'b'], message: '不在范围内' }), 'c')
    ).resolves.toBe('不在范围内')
  })

  it('支持 callback 风格的异步自定义校验', async () => {
    const custom = rule({
      message: '异步失败',
      validator: (_rule, value, callback) => {
        setTimeout(() => {
          callback(value === 'ok' ? undefined : new Error('异步失败'))
        }, 5)
      }
    })

    await expect(validateNormalizedRule(custom, 'ok')).resolves.toBe('')
    await expect(validateNormalizedRule(custom, 'bad')).resolves.toBe('异步失败')
  })
})

describe('matchesTrigger', () => {
  it('无触发器和多触发器均按预期匹配', () => {
    expect(matchesTrigger(rule({ trigger: 'blur' }), 'blur')).toBe(true)
    expect(matchesTrigger(rule({ trigger: 'blur' }), 'change')).toBe(false)
    expect(matchesTrigger(rule({ trigger: ['blur', 'change'] }), 'change')).toBe(true)
  })
})
