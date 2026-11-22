import type { Ref } from 'vue'

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

/**
 * 参与容器单位联动的数字组件描述。
 */
export interface UnitLinkageField {
  /** 当前组件是否支持指定单位 */
  accepts: (unit: UnitOption) => boolean
  /** 将指定单位应用到当前组件 */
  apply: (unit: UnitOption) => void
}

/**
 * 容器通过 provide 向内部数字组件提供单位联动上下文。
 */
export interface UnitLinkageContext {
  /** 容器是否开启单位联动 */
  enabled: Readonly<Ref<boolean>>
  /** 当前已挂载并参与联动的数字组件 */
  fields: Set<UnitLinkageField>
}
