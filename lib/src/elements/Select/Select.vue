<template>
  <div v-if="read">
    <div>{{ displayText }}</div>
  </div>

  <Select
    v-model="value"
    v-bind="$attrs"
    @change="selectChange"
    :multiple="isMultiple"
    :filterable="searchable"
    :tags="tags"
    :options="currentOptions"
    clearable
    :loading="loading"
    v-else
  />
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useFormInstance, useSelect, useUI } from '@/hooks'
import type { SelectProps, SelectValue } from '@/types'

const { Select } = useUI()

const props = withDefaults(defineProps<SelectProps>(), {
  options: () => [],
  multiple: false,
  filterable: true,
  tags: false,
  mode: 'static',
  name: ''
})

const value = defineModel<SelectValue | SelectValue[]>()

const formInstance = useFormInstance()

// 使用 computed 包装 getter 方法，保持响应式
const read = computed(() => formInstance?.getRead() ?? false)

const { currentOptions, selectChange, loading } = useSelect(props)

const isMultiple = computed(() => props.multiple || props.tags)

// 标签模式必须允许输入，因此会强制开启搜索
const searchable = computed(() => props.filterable || props.tags)

const displayText = computed(() => {
  const selected = value.value

  if (isMultiple.value) {
    const selectedValues = Array.isArray(selected) ? selected : []

    return selectedValues
      .map((item) => currentOptions.value.find((option) => option.value === item)?.label ?? item)
      .join('、')
  }

  return currentOptions.value.find((option) => option.value === selected)?.label
})

watch(value, selectChange)
</script>
