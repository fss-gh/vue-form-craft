<template>
  <div>
    <Button type="primary" plain size="small" @click="handleOpen">编辑</Button>
    <Modal
      v-model="visible"
      title="对象初始数据"
      append-to-body
      destroy-on-close
      @close="handleClose"
    >
      <FormRender
        v-model="formValues"
        :schema="schemaData"
        :class="ns('obj-initial-values-form')"
      />
      <template #footer>
        <div style="display: flex; justify-content: center">
          <Button @click="handleClear">清空</Button>
          <Button type="primary" @click="handleSave">保存</Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { cloneDeep, isPlainObject } from 'lodash'
import { ref } from 'vue'
import { FormRender } from '@/components'
import { useDesignInstance, useUI } from '@/hooks'
import type { FormItemType, FormSchema } from '@/types'
import { ns } from '@/utils'

const { Button, Modal } = useUI()

const modelValue = defineModel<Record<string, any>>()

const designInstance = useDesignInstance()!

const visible = ref(false)
const formValues = ref<Record<string, any>>({})
const schemaData = ref<FormSchema>({
  labelWidth: 100,
  labelAlign: 'top',
  size: 'small',
  submitBtn: false,
  resetBtn: false,
  items: []
})

const getNodeItems = (): FormItemType[] => {
  const node = designInstance.getNodeByKey(designInstance.getCurrentKey())

  return cloneDeep(node?.items || [])
}

const handleOpen = () => {
  formValues.value = isPlainObject(modelValue.value)
    ? cloneDeep(modelValue.value as Record<string, any>)
    : {}

  schemaData.value = {
    labelWidth: 100,
    labelAlign: 'top',
    size: 'small',
    submitBtn: false,
    resetBtn: false,
    initialValues: cloneDeep(formValues.value),
    items: getNodeItems()
  }

  visible.value = true
}

const handleClear = () => {
  formValues.value = {}
}

const handleSave = () => {
  modelValue.value = cloneDeep(formValues.value)
  visible.value = false
}

const handleClose = () => {
  formValues.value = isPlainObject(modelValue.value)
    ? cloneDeep(modelValue.value as Record<string, any>)
    : {}
}
</script>

<style scoped lang="scss">
@use '@/style' as *;

@include ns('obj-initial-values-form') {
  max-height: 60vh;
  overflow: auto;
}
</style>
