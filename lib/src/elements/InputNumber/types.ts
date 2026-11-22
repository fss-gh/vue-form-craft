/**
 * 数字输入框单位选项。
 * multiplier 表示该单位换算到所属分类基准单位的倍数。
 */
export interface UnitOption {
  label: string
  value: string
  multiplier: number
}

/**
 * 单位分类，分类下的所有单位使用同一基准单位。
 */
export interface UnitCategory {
  name: string
  units: UnitOption[]
}
