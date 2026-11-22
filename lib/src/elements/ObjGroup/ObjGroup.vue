<template>
  <FormItemGroup :list="parseList" :designKey="formItemProps.designKey" :style="parseStyle" />
</template>

<script setup lang="ts">
import { cloneDeep, isEqual, isPlainObject } from 'lodash'
import { computed, onBeforeMount, provide } from 'vue'
import { FormItemGroup } from '@/components'
import { useFormInstance } from '@/hooks'
import { $unitLinkage } from '@/symbol'
import type { ComponentBaseProps } from '@/types'
import type { UnitLinkageContext } from '../InputNumber/types'

interface Props extends ComponentBaseProps {
  unitLinkage?: boolean
  initialData?: () =>Record<string, any>
}

const props = defineProps<Props>()

// 对象容器的数据路径只初始化一次
const base = props.formItemProps.name

const parseList = computed(() => {
  return (
    props.formItemProps.items?.map((item) => ({
      ...item,
      name: `${base}.${item.name}`
    })) || []
  )
})

const formInstance = useFormInstance()

// 容器内开启联动后，数字组件会注册到该上下文并在单位变化时同步
const unitLinkageContext: UnitLinkageContext = {
  enabled: computed(() => Boolean(props.unitLinkage)),
  fields: new Set()
}

provide($unitLinkage, unitLinkageContext)

const parseStyle = computed(() => {
  const style: any = {
    width: '100%',
    boxSizing: 'border-box'
  }

  if (formInstance?.getDesign()) {
    style.background = '#f4f3f3'
    style.padding = '10px'
  }

  return style
})

/**
 * 用对象容器的初始数据补齐缺失字段，已有表单值优先。
 */
const mergeInitialData = (
  current: unknown,
  defaults: Record<string, any>
): Record<string, any> => {
  const result: Record<string, any> = isPlainObject(current)
    ? { ...(current as Record<string, any>) }
    : {}

  Object.entries(defaults).forEach(([key, defaultValue]) => {
    if (result[key] === undefined) {
      result[key] = cloneDeep(defaultValue)
      return
    }

    if (isPlainObject(result[key]) && isPlainObject(defaultValue)) {
      result[key] = mergeInitialData(result[key], defaultValue as Record<string, any>)
    }
  })

  return result
}

const applyInitialData = () => {
  if (!formInstance || formInstance.getDesign()) return

  const defaults = props.initialData?.() || {}

  if (!isPlainObject(defaults) || !Object.keys(defaults).length) return

  const current = formInstance.getFieldValue(base)

  // 已有非对象数据时不覆盖
  if (current !== undefined && current !== null && !isPlainObject(current)) return

  const next = mergeInitialData(current, defaults as Record<string, any>)

  if (!isEqual(current, next)) {
    void formInstance.setFieldValue(base, next)
  }
}

onBeforeMount(applyInitialData)
</script>

<style lang="scss">
.vfc-ObjGroup {
  position: relative;
  width: 100%;

  .vfc-ObjGroup-render {
    .el-form-item {
      margin-bottom: 18px;
    }
  }
}
</style>
