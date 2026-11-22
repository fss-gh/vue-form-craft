<template>
  <FormItemGroup v-if="tab" :list="tab.items ?? []" :designKey="tab.designKey" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FormItemGroup } from '@/components'
import type { FormItemType } from '@/types'

const props = defineProps<{
  tabName: string
  getTabs: () => FormItemType[]
}>()

// 通过 getter 读取最新的 tab 数据，避免 Tabs 内容被 UI 库缓存后无法更新
const tab = computed(() => props.getTabs().find((item) => item.name === props.tabName))
</script>
