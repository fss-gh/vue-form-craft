<template>
  <Modal
    v-model="visible"
    title="预览"
    width="70%"
    center
    destroyOnClose
    :to="`.${ns('form-design')}`"
    top="10vh"
    @close="formValues = {}"
  >
    <div :class="ns('preview')">
      <div :class="ns('preview-toolbar')">
        <div :class="ns('preview-modes')" role="group" aria-label="预览设备模式">
          <button
            v-for="mode in modeOptions"
            :key="mode.value"
            type="button"
            :class="[ns('preview-mode-btn'), { 'is-active': previewMode === mode.value }]"
            :data-mode="mode.value"
            :aria-pressed="previewMode === mode.value"
            :title="`${mode.label}预览`"
            @click="previewMode = mode.value"
          >
            <svg
              v-if="mode.value === 'pc'"
              :class="ns('preview-mode-icon')"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="2.5" y="3.5" width="19" height="13" rx="2" />
              <path d="M8 20.5h8M12 16.5v4" />
            </svg>
            <svg
              v-else-if="mode.value === 'tablet'"
              :class="ns('preview-mode-icon')"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="4.5" y="2.5" width="15" height="19" rx="2.5" />
              <path d="M12 18.5h.01" />
            </svg>
            <svg
              v-else
              :class="ns('preview-mode-icon')"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
              <path d="M12 18.5h.01" />
            </svg>
            <span>{{ mode.label }}</span>
          </button>
        </div>
        <span :class="ns('preview-mode-tip')">{{ currentMode.description }}</span>
      </div>

      <div :class="ns('preview-stage')">
        <div
          :class="[ns('preview-device'), ns('preview-device-' + previewMode)]"
          :data-device="previewMode"
        >
          <FormRender
            ref="formRef"
            v-model="formValues"
            class="preview-FormRender"
            :schema="designInstance.getSchema()"
            @finish="handleFinish"
          />
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { FormRender } from '@/components'
import { useDesignInstance, useUI } from '@/hooks'
import type { FormInstance } from '@/types'
import { ns } from '@/utils'

type PreviewMode = 'pc' | 'tablet' | 'mobile'

interface PreviewModeOption {
  value: PreviewMode
  label: string
  description: string
}

const modeOptions: PreviewModeOption[] = [
  { value: 'pc', label: 'PC', description: '桌面端 · 自适应宽度' },
  { value: 'tablet', label: '平板', description: '平板 · 768px' },
  { value: 'mobile', label: '移动端', description: '移动端 · 375px' }
]

const { Modal } = useUI()

const designInstance = useDesignInstance()!

const formValues = ref({})
const formRef = ref<FormInstance>()

const visible = defineModel<boolean>()

const previewMode = ref<PreviewMode>('pc')

const currentMode = computed(
  () => modeOptions.find((mode) => mode.value === previewMode.value) ?? modeOptions[0]!
)

const handleFinish = async () => {
  console.log(formValues.value)
  alert(JSON.stringify(formValues.value, null, 2))
}
</script>

<style scoped lang="scss">
@use '@/style' as *;

@include ns('preview') {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@include ns('preview-toolbar') {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  justify-content: space-between;
}

@include ns('preview-modes') {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 3px;
  background: $bgColor3;
  border: 1px solid $borderColor;
  border-radius: 8px;
}

@include ns('preview-mode-btn') {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 10px;
  font-size: 13px;
  color: $textColor3;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    color: $textColor1;
    background: $bgColor;
  }

  &.is-active {
    color: $themeColor;
    background: $bgColor;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  &:focus-visible {
    outline: 2px solid $themeColor;
    outline-offset: 1px;
  }
}

@include ns('preview-mode-icon') {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
}

@include ns('preview-mode-tip') {
  font-size: 12px;
  color: $textColorSecondary;
}

@include ns('preview-stage') {
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 16px;
  overflow-x: auto;
  background: $bgColor3;
  border-radius: 8px;
}

@include ns('preview-device') {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  background: $bgColor;
  transition:
    width 0.25s ease,
    max-width 0.25s ease;
}

@include ns('preview-device-pc') {
  max-width: 100%;
}

@include ns('preview-device-tablet') {
  box-sizing: border-box;
  width: 768px;
  max-width: 100%;
  padding: 18px 20px;
  border: 1px solid $borderColor;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

@include ns('preview-device-mobile') {
  box-sizing: border-box;
  width: 375px;
  max-width: 100%;
  padding: 16px 14px;
  border: 1px solid $borderColor;
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}
</style>
