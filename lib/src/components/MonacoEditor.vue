<template>
  <div v-if="error" class="monaco-load-error" role="alert">Monaco 编辑器加载失败</div>
  <VueMonacoEditor v-else-if="ready" v-bind="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </VueMonacoEditor>
</template>

<script setup lang="ts">
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import { onMounted, ref } from 'vue'
import { setupMonaco } from '@/utils/monaco'

defineOptions({ inheritAttrs: false })

const ready = ref(false)
const error = ref(false)

onMounted(async () => {
  try {
    await setupMonaco()
    ready.value = true
  } catch (err) {
    error.value = true
    console.error('Monaco 编辑器初始化失败：', err)
  }
})
</script>
