import type { UnitCategory, UnitOption } from './types'
import unitsJson from './units.json'

export interface UnitEntry extends UnitOption {
  category: string
}

export const defaultUnitData = unitsJson as UnitCategory[]

export const defaultUnitCategorySelectOptions = defaultUnitData.map((category) => ({
  label: category.name,
  value: category.name
}))

/**
 * 获取某个分类下的默认单位选项。
 * 分类为空或不存在时返回空数组。
 */
export const getDefaultUnitOptionsByCategory = (category?: string) => {
  const target = defaultUnitData.find((item) => item.name === category)

  return (target?.units ?? []).map((unit) => ({
    label: `${unit.label} (${unit.value})`,
    value: unit.value
  }))
}
