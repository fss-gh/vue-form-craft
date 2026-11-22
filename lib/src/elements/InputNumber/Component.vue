<template>
  <div v-if="read" :class="ns('input-number-read')">
    <span>{{ value }}</span>
    <span v-if="unitEnabled && selectedUnitCode" :class="ns('input-number-read-unit')">
      {{ selectedUnitCode }}
    </span>
  </div>

  <div v-else-if="unitEnabled" :class="ns('input-number-unit')">
    <InputNumber v-bind="$attrs" v-model="value" :name="name" :class="ns('input-number-unit-input')" />

    <Popover
      :visible="unitPopoverVisible"
      trigger="click"
      placement="bottom-end"
      @update:visible="unitPopoverVisible = $event"
    >
      <template #default>
        <button
          type="button"
          :class="ns('input-number-unit-btn')"
          :title="
            selectedUnitLabel
              ? `当前单位：${selectedUnitLabel} (${selectedUnitCode})`
              : '选择单位'
          "
          aria-label="选择单位"
          @click="syncActiveCategory"
        >
          <span :class="ns('input-number-unit-text')">{{ unitButtonLabel }}</span>
          <Icon name="arrowDown" :class="ns('input-number-unit-arrow')" />
        </button>
      </template>

      <template #content>
        <div :class="ns('input-number-unit-popover')">
          <div :class="ns('input-number-unit-list')" role="listbox" aria-label="可选单位">
            <button
              v-for="unit in activeUnits"
              :key="unit.value"
              type="button"
              role="option"
              :aria-selected="selectedUnitCode === unit.value"
              :class="[
                ns('input-number-unit-option'),
                { 'is-active': selectedUnitCode === unit.value }
              ]"
              @click="applyUnit(unit)"
            >
              <span :class="ns('input-number-unit-option-label')">{{ unit.label }}</span>
              <span :class="ns('input-number-unit-option-code')">{{ unit.value }}</span>
            </button>

            <span v-if="!activeUnits.length" :class="ns('input-number-unit-empty')">暂无单位</span>
          </div>
        </div>
      </template>
    </Popover>
  </div>

  <InputNumber v-else v-bind="$attrs" v-model="value" :name="name" />
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Icon } from '@/components'
import { useFormInstance, useUI } from '@/hooks'
import { $unitLinkage } from '@/symbol'
import type { FormInstance } from '@/types'
import { ns } from '@/utils'
import type { UnitCategory, UnitLinkageField, UnitOption } from './types'
import { defaultUnitData, type UnitEntry } from './units'

const props = defineProps<{
  name?: string
  unitEnabled?: boolean
  unitCategory?: string
  defaultUnit?: string
  unitData?: UnitCategory[]
}>()

const { InputNumber, Popover } = useUI()

const value = defineModel<number>()

const formInstance = useFormInstance() as FormInstance | undefined

// 最近的自增容器 / 对象容器提供的单位联动上下文
const unitLinkage = inject($unitLinkage, null)

// 使用 computed 包装 getter 方法，保持响应式
const read = computed(() => formInstance?.getRead() ?? false)

// 没有 FormRender 上下文时（例如单独使用该组件），单位暂存在本地
const localUnit = ref('')

const unitPopoverVisible = ref(false)

const activeCategory = ref('')

// 单位数据从 JSON 加载；也允许通过 componentProps.unitData 传入自定义数据
const unitCategories = computed<UnitCategory[]>(() =>
  props.unitData?.length ? props.unitData : defaultUnitData
)

const configuredCategory = computed(() => {
  const category = props.unitCategory

  return category && unitCategories.value.some((item) => item.name === category)
    ? category
    : ''
})

const unitEntries = computed<UnitEntry[]>(() =>
  unitCategories.value.flatMap((category) =>
    category.units.map((unit) => ({
      ...unit,
      category: category.name
    }))
  )
)

// 单位数据的 key 固定为：数字组件字段标识 + "_unit"
const unitKey = computed(() => (props.name ? `${props.name}_unit` : ''))

const validDefaultUnit = computed(() => {
  const unit = unitEntries.value.find((item) => item.value === props.defaultUnit)

  if (!unit) return undefined

  if (props.unitCategory && unit.category !== props.unitCategory) return undefined

  return unit
})

const storedUnit = computed(() => {
  if (unitKey.value && formInstance) {
    return formInstance.getFieldValue(unitKey.value)
  }

  return localUnit.value
})

const selectedUnitCode = computed(() => {
  const stored = storedUnit.value

  if (typeof stored === 'string' && stored) {
    return stored
  }

  return validDefaultUnit.value?.value || ''
})

const currentUnit = computed(() =>
  unitEntries.value.find((unit) => unit.value === selectedUnitCode.value)
)

const selectedUnitLabel = computed(() => currentUnit.value?.label || '')

// 表单中只显示单位的 value
const unitButtonLabel = computed(() => selectedUnitCode.value || '单位')

const activeUnits = computed(
  () => unitCategories.value.find((category) => category.name === activeCategory.value)?.units ?? []
)

const setStoredUnit = (unitCode: string) => {
  if (formInstance && unitKey.value) {
    formInstance.setFieldValue(unitKey.value, unitCode)
    return
  }

  localUnit.value = unitCode
}

const unitLinkageField: UnitLinkageField = {
  accepts(unit) {
    const target = unitEntries.value.find((item) => item.value === unit.value)

    if (!target) return false

    const category = configuredCategory.value

    // 配置了分类时只同步该分类下的单位，避免写入无效单位
    return !category || target.category === category
  },
  apply(unit) {
    setStoredUnit(unit.value)
  }
}

let unregisterUnitLinkage: (() => void) | undefined

const syncUnitLinkageRegistration = () => {
  unregisterUnitLinkage?.()
  unregisterUnitLinkage = undefined

  if (!props.unitEnabled || !unitLinkage?.enabled.value) return

  unitLinkage.fields.add(unitLinkageField)
  unregisterUnitLinkage = () => unitLinkage.fields.delete(unitLinkageField)
}

watch(
  () => [props.unitEnabled, unitLinkage?.enabled.value],
  syncUnitLinkageRegistration,
  { immediate: true }
)

onBeforeUnmount(() => unregisterUnitLinkage?.())

const syncLinkedUnits = (unit: UnitOption) => {
  if (!props.unitEnabled || !unitLinkage?.enabled.value) return

  unitLinkage.fields.forEach((field) => {
    if (field !== unitLinkageField && field.accepts(unit)) {
      field.apply(unit)
    }
  })
}

watch(
  unitCategories,
  (categories) => {
    if (!categories.some((category) => category.name === activeCategory.value)) {
      activeCategory.value = configuredCategory.value || categories[0]?.name || ''
    }
  },
  { immediate: true }
)

watch(
  () => currentUnit.value?.category,
  (category) => {
    if (category) {
      activeCategory.value = category
    }
  },
  { immediate: true }
)

watch(configuredCategory, (category) => {
  if (!currentUnit.value?.category && category) {
    activeCategory.value = category
  }
})

// 默认单位在不存在已选单位时写入字段标识 + "_unit"
const initDefaultUnit = () => {
  if (!props.unitEnabled || !formInstance || !unitKey.value || !props.defaultUnit) return

  if (!validDefaultUnit.value) return

  const stored = formInstance.getFieldValue(unitKey.value)

  if (stored === undefined || stored === null || stored === '') {
    formInstance.setFieldValue(unitKey.value, props.defaultUnit)
  }
}

onMounted(initDefaultUnit)

watch(
  () => [props.unitEnabled, props.unitCategory, props.defaultUnit, props.name],
  initDefaultUnit
)

const syncActiveCategory = () => {
  const category = currentUnit.value?.category || configuredCategory.value

  if (category) {
    activeCategory.value = category
  }
}

const normalizeConvertedValue = (num: number) => {
  if (!Number.isFinite(num)) return num

  return Number(num.toPrecision(12))
}

const applyUnit = (unit: UnitOption) => {
  const previousUnit = currentUnit.value

  // 仅在同一分类内切换单位时按换算倍数转换数值
  if (
    previousUnit &&
    previousUnit.category === activeCategory.value &&
    previousUnit.multiplier > 0 &&
    unit.multiplier > 0 &&
    typeof value.value === 'number'
  ) {
    const convertedValue = (value.value * previousUnit.multiplier) / unit.multiplier
    value.value = normalizeConvertedValue(convertedValue)
  }

  setStoredUnit(unit.value)

  // 同步容器内其他支持该单位的数字组件
  syncLinkedUnits(unit)

  unitPopoverVisible.value = false
}
</script>

<style scoped lang="scss">
@use '@/style' as *;

@include ns('input-number-unit') {
  display: flex;
  align-items: stretch;
  width: 100%;
  min-width: 0;
}

@include ns('input-number-unit-input') {
  flex: 1;
  min-width: 0;
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;

  :deep(.el-input__wrapper) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
}

@include ns('input-number-unit-btn') {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 52px;
  margin: 0 0 0 -1px;
  padding: 0 8px;
  color: $textColor3;
  font-family: inherit;
  font-size: 12px;
  line-height: 1;
  background-color: $bgColor3;
  border: 1px solid $borderColor;
  border-left: 0;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s,
    background-color 0.2s;

  &:hover {
    color: $themeColor;
    background-color: $lightThemeColor;
    border-color: $themeColor;
  }

  &:focus-visible {
    outline: 2px solid $themeColor;
    outline-offset: -2px;
  }
}

@include ns('input-number-unit-text') {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@include ns('input-number-unit-arrow') {
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
}

@include ns('input-number-read') {
  color: $textColor1;
}

@include ns('input-number-read-unit') {
  margin-left: 4px;
  color: $textColor3;
  font-size: 0.9em;
}
</style>

<style lang="scss">
@use '@/style' as *;

// Popover 内容会被 Teleport 到组件根节点之外，因此使用全局样式
.vfc-input-number-unit-popover {
  display: flex;
  box-sizing: border-box;
  width: 120px;
  height: auto;
  max-height: 240px;
  overflow:auto;
}

.vfc-input-number-unit-categories {
  display: flex;
  flex: 0 0 88px;
  flex-direction: column;
  gap: 2px;
  box-sizing: border-box;
  width: 88px;
  padding: 4px;
  overflow-y: auto;
  background-color: $bgColor3;
  border-right: 1px solid $borderColor;
}

.vfc-input-number-unit-category {
  flex: 0 0 auto;
  width: 100%;
  height: 30px;
  margin: 0;
  padding: 0 8px;
  color: $textColor3;
  font-family: inherit;
  font-size: 12px;
  text-align: left;
  background-color: transparent;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
  transition:
    color 0.2s,
    background-color 0.2s;

  &:hover {
    color: $themeColor;
    background-color: $bgColor;
  }

  &.is-active {
    color: $themeColor;
    font-weight: 600;
    background-color: $bgColor;
  }

  &:focus-visible {
    outline: 2px solid $themeColor;
    outline-offset: -2px;
  }
}

.vfc-input-number-unit-list {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  align-content: start;
  gap: 4px;
  box-sizing: border-box;
  min-width: 0;
  padding: 4px;
  overflow-y: auto;
}

.vfc-input-number-unit-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
  min-height: 30px;
  margin: 0;
  padding: 0 8px;
  color: $textColor1;
  font-family: inherit;
  font-size: 12px;
  text-align: left;
  background-color: $bgColor;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s,
    background-color 0.2s;

  &:hover {
    color: $themeColor;
    background-color: $lightThemeColor;
  }

  &.is-active {
    color: $themeColor;
    background-color: $lightThemeColor;
    border-color: $themeColor;
  }

  &:focus-visible {
    outline: 2px solid $themeColor;
    outline-offset: -2px;
  }
}

.vfc-input-number-unit-option-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vfc-input-number-unit-option-code {
  flex: 0 0 auto;
  color: $textColorSecondary;
  font-size: 10px;
}

.vfc-input-number-unit-empty {
  grid-column: 1 / -1;
  padding: 8px;
  color: $textColorSecondary;
  font-size: 12px;
  text-align: center;
}
</style>
