<template>
  <Select
    v-model="modelValue"
    :options="options"
    :clearable="true"
    :disabled="!category"
    :placeholder="placeholder"
    style="width: 100%"
  />
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { getDefaultUnitOptionsByCategory } from '@/elements/InputNumber/units'
import { useFormInstance, useUI } from '@/hooks'
import type { FormInstance } from '@/types'

const { Select } = useUI()

const modelValue = defineModel<string>()

const formInstance = useFormInstance() as FormInstance | undefined

// 单位分类保存在数字组件的 componentProps.unitCategory 中
const category = computed(() => {
  const value = formInstance?.getFieldValue('componentProps.unitCategory')

  return typeof value === 'string' ? value : ''
})

const options = computed(() => getDefaultUnitOptionsByCategory(category.value))

const placeholder = computed(() =>
  category.value ? '请选择默认单位' : '请先选择单位分类'
)

// 切换分类后，若已选默认单位不属于当前分类则清空
watch(
  options,
  (items) => {
    if (modelValue.value && !items.some((item) => item.value === modelValue.value)) {
      modelValue.value = ''
    }
  },
  { immediate: true }
)
</script>
