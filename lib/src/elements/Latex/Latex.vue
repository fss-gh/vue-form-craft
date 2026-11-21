<template>
  <div
    ref="rootRef"
    :class="[ns('latex'), { 'is-display': displayMode }]"
    @keydown.esc="cancelEditing"
  >
    <div :class="ns('latex-main')">
      <div :class="[ns('latex-preview'), { 'is-display': displayMode }]" :style="previewStyle">
        <div v-if="html" :class="ns('latex-content')" v-html="html"></div>
        <div v-else :class="ns('latex-empty')">{{ emptyText }}</div>
      </div>

      <button
        v-if="canEdit && !editing"
        type="button"
        :class="ns('latex-edit-btn')"
        title="编辑公式"
        aria-label="编辑公式"
        @click="startEditing"
      >
        <Icon name="edit" :class="ns('latex-edit-icon')" />
      </button>
    </div>

    <div v-if="editing" :class="ns('latex-editor')">
      <div :class="ns('latex-input-wrap')">
        <Textarea
          v-model="draft"
          :class="ns('latex-input')"
          :placeholder="placeholder"
          :autosize="{ minRows, maxRows }"
          spellcheck="false"
        />

        <Popover
          v-if="availableTemplates.length"
          :visible="templateVisible"
          trigger="click"
          placement="bottom-end"
          :width="320"
          @update:visible="templateVisible = $event"
        >
          <template #default>
            <button
              type="button"
              :class="ns('latex-template-btn')"
              title="选择公式模板"
              aria-label="选择公式模板"
            >
              <Icon name="template" :class="ns('latex-template-icon')" />
            </button>
          </template>

          <template #content>
            <div :class="ns('latex-template-popover')" role="listbox" aria-label="公式模板">
              <div :class="ns('latex-template-header')">选择公式模板</div>
              <button
                v-for="(item, index) in templateItems"
                :key="index"
                type="button"
                role="option"
                :class="ns('latex-template-item')"
                @click="applyTemplate(item.template)"
              >
                <span :class="ns('latex-template-item-label')">{{ item.label }}</span>
                <span
                  v-if="item.html"
                  :class="ns('latex-template-item-preview')"
                  v-html="item.html"
                ></span>
                <span v-else :class="ns('latex-template-item-raw')">{{ item.expression }}</span>
              </button>
            </div>
          </template>
        </Popover>
      </div>

      <div :class="ns('latex-editor-footer')">
        <span :class="ns('latex-tip')">支持 KaTeX 语法，输入后将实时渲染公式</span>
        <div :class="ns('latex-actions')">
          <Button size="small" :class="ns('latex-cancel-btn')" @click="cancelEditing">
            取消
          </Button>
          <Button
            type="primary"
            size="small"
            :class="ns('latex-confirm-btn')"
            @click="finishEditing"
          >
            确定
          </Button>
        </div>
      </div>
    </div>

    <div v-if="showError && error" :class="ns('latex-error')" role="alert">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import katex, { type KatexOptions } from 'katex'
import 'katex/dist/katex.min.css'
import { computed, nextTick, ref, watch } from 'vue'
import { Icon } from '@/components'
import { useFormInstance, useUI } from '@/hooks'
import { ns } from '@/utils'

export interface LatexTemplate {
  /** 模板名称 */
  label?: string
  /** 模板中的 LaTeX 公式 */
  expression: string
}

export interface Props {
  /** 静态公式（通常为 string；也兼容模板表达式解析出的数字等值）。可编辑模式下作为空值时的默认展示 */
  expression?: unknown
  /** 是否允许终端用户编辑公式 */
  editable?: boolean
  /** 编辑时可选的公式模板 */
  templates?: LatexTemplate[]
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  readonly?: boolean
  /** KaTeX displayMode */
  displayMode?: boolean
  /** 公式字号 */
  fontSize?: number
  /** 兼容 VaTex 的 fontsize 写法 */
  fontsize?: number
  /** KaTeX 解析失败时源码显示的颜色 */
  errorColor?: string
  minRuleThickness?: number
  macros?: KatexOptions['macros']
  strict?: KatexOptions['strict']
  /** 是否显示具体的解析错误信息 */
  showError?: boolean
  minRows?: number
  maxRows?: number
}

const props = withDefaults(defineProps<Props>(), {
  editable: false,
  placeholder: '请输入 LaTeX 公式',
  emptyText: '',
  disabled: false,
  readonly: false,
  displayMode: false,
  fontSize: undefined,
  fontsize: 16,
  errorColor: '#cc0000',
  minRuleThickness: 0.04,
  macros: undefined,
  strict: 'warn',
  showError: true,
  minRows: 2,
  maxRows: 10
})

const { Button, Popover, Textarea } = useUI()

const value = defineModel<string>()

const formInstance = useFormInstance()

// 使用 computed 包装 getter 方法，保持响应式
const read = computed(() => formInstance?.getRead() ?? false)
const design = computed(() => formInstance?.getDesign() ?? false)

const canEdit = computed(
  () => props.editable && !read.value && !design.value && !props.disabled && !props.readonly
)

const editing = ref(false)
const draft = ref('')
const templateVisible = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const availableTemplates = computed(() => {
  const templates = Array.isArray(props.templates) ? props.templates : []

  return templates.filter((template): template is LatexTemplate => {
    return (
      !!template &&
      typeof template === 'object' &&
      typeof template.expression === 'string' &&
      template.expression.trim().length > 0
    )
  })
})

const getTemplateLabel = (template: LatexTemplate, index: number) => {
  const label = typeof template.label === 'string' ? template.label.trim() : ''
  return label || `模板 ${index + 1}`
}

const applyTemplate = async (template: LatexTemplate) => {
  draft.value = template.expression
  templateVisible.value = false

  await nextTick()
  rootRef.value?.querySelector<HTMLTextAreaElement>('textarea')?.focus()
}

const formula = computed(() => {
  const current = value.value
  if (typeof current === 'string' && current.trim()) return current
  if (current != null && String(current).trim()) return String(current)
  return props.expression == null ? '' : String(props.expression)
})

// 编辑时实时预览草稿，确认前不写回表单数据
const displayExpression = computed(() => (editing.value ? draft.value : formula.value))

watch(canEdit, (allowed) => {
  if (!allowed) {
    editing.value = false
    templateVisible.value = false
  }
})

const startEditing = async () => {
  if (!canEdit.value || editing.value) return

  draft.value = formula.value
  templateVisible.value = false
  editing.value = true

  await nextTick()
  rootRef.value?.querySelector<HTMLTextAreaElement>('textarea')?.focus()
}

const cancelEditing = () => {
  editing.value = false
  templateVisible.value = false
}

const finishEditing = () => {
  if (!editing.value) return

  value.value = draft.value
  editing.value = false
  templateVisible.value = false
}

const fontSize = computed(() => props.fontSize ?? props.fontsize ?? 16)

const previewStyle = computed(() => ({
  fontSize: `${fontSize.value}px`
}))

const emptyText = computed(() => {
  if (props.emptyText) return props.emptyText
  return design.value ? '请在右侧属性面板中配置 LaTeX 公式' : '公式预览'
})

const options = computed<KatexOptions>(() => ({
  displayMode: props.displayMode,
  errorColor: props.errorColor,
  minRuleThickness: props.minRuleThickness,
  macros: props.macros,
  strict: props.strict,
  trust: false
}))

const templateItems = computed(() => {
  return availableTemplates.value.map((template, index) => {
    const expression = template.expression.trim()
    let html: string

    try {
      html = katex.renderToString(expression, {
        ...options.value,
        displayMode: false,
        throwOnError: true
      })
    } catch {
      html = ''
    }

    return {
      template,
      label: getTemplateLabel(template, index),
      expression,
      html
    }
  })
})

const renderResult = computed(() => {
  const expression = displayExpression.value.trim()

  if (!expression) return { html: '', error: '' }

  try {
    return {
      html: katex.renderToString(expression, {
        ...options.value,
        throwOnError: true
      }),
      error: ''
    }
  } catch (err) {
    let html: string

    // 解析失败时降级为 KaTeX 的错误渲染，仍展示原始公式
    try {
      html = katex.renderToString(expression, {
        ...options.value,
        throwOnError: false
      })
    } catch {
      html = ''
    }

    return {
      html,
      error: err instanceof Error ? err.message : String(err)
    }
  }
})

const html = computed(() => renderResult.value.html)
const error = computed(() => renderResult.value.error)
</script>

<style scoped lang="scss">
@use '@/style' as *;

@include ns('latex') {
  width: 100%;

  @include ns('latex-main') {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  @include ns('latex-editor') {
    margin-top: 8px;
  }

  @include ns('latex-input-wrap') {
    position: relative;
  }

  @include ns('latex-template-btn') {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    color: $textColorSecondary;
    cursor: pointer;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    transition:
      color 0.2s ease,
      background-color 0.2s ease,
      border-color 0.2s ease;

    &:hover {
      color: $themeColor;
      background: $bgColor3;
      border-color: $borderColor;
    }

    &:focus-visible {
      outline: 2px solid $themeColor;
      outline-offset: 1px;
    }
  }

  @include ns('latex-template-icon') {
    font-size: 16px;
  }

  @include ns('latex-input') {
    width: 100%;
    font-family:
      ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;

    :deep(textarea) {
      padding-right: 40px;
    }
  }

  @include ns('latex-editor-footer') {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    align-items: center;
    justify-content: space-between;
    margin-top: 6px;
  }

  @include ns('latex-actions') {
    display: flex;
    flex-shrink: 0;
    gap: 8px;
    align-items: center;
  }

  @include ns('latex-tip') {
    flex: 1;
    min-width: 160px;
    font-size: 12px;
    line-height: 1.4;
    color: $textColorSecondary;
  }

  @include ns('latex-preview') {
    display: flex;
    flex: 1;
    align-items: center;
    min-width: 0;
    min-height: 52px;
    padding: 12px 16px;
    overflow-x: auto;
    background: $bgColor3;
    border: 1px dashed $borderColor;
    border-radius: 4px;
  }

  @include ns('latex-preview.is-display') {
    justify-content: center;
  }

  @include ns('latex-edit-btn') {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    color: $textColorSecondary;
    cursor: pointer;
    background: transparent;
    border: 1px solid $borderColor;
    border-radius: 4px;
    transition:
      color 0.2s ease,
      border-color 0.2s ease,
      background-color 0.2s ease;

    &:hover {
      color: $themeColor;
      background: $bgColor3;
      border-color: $themeColor;
    }

    &:focus-visible {
      outline: 2px solid $themeColor;
      outline-offset: 1px;
    }
  }

  @include ns('latex-edit-icon') {
    font-size: 16px;
  }

  @include ns('latex-content') {
    min-width: 0;

    :deep(.katex-display) {
      margin: 0;
    }
  }

  @include ns('latex-empty') {
    font-size: 13px;
    color: $textColorSecondary;
  }

  @include ns('latex-error') {
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.4;
    color: $dangerColor;
    word-break: break-word;
  }
}

// Popover 内容会被传送到组件根节点之外，因此模板列表样式需要使用全局选择器
:global(.#{$namespace}-latex-template-popover) {
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-sizing: border-box;
  width: 300px;
  max-width: calc(100vw - 48px);
  max-height: 320px;
  padding: 4px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

:global(.#{$namespace}-latex-template-header) {
  flex-shrink: 0;
  padding: 4px 8px 2px;
  font-size: 12px;
  font-weight: 500;
  color: $textColorSecondary;
}

:global(.#{$namespace}-latex-template-item) {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 6px;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 8px 10px;
  font: inherit;
  text-align: left;
  cursor: pointer;
  background: $bgColor3;
  border: 1px solid $borderColor;
  border-radius: 6px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;

  &:hover,
  &:focus-visible {
    background: $lightThemeColor;
    border-color: $themeColor;
    outline: none;
  }
}

:global(.#{$namespace}-latex-template-item-label) {
  display: block;
  width: 100%;
  font-size: 12px;
  font-weight: 600;
  color: $textColor1;
  overflow-wrap: anywhere;
}

:global(.#{$namespace}-latex-template-item-preview) {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 6px 8px;
  overflow-x: auto;
  overflow-y: hidden;
  color: $textColor1;
  background: $bgColor;
  border: 1px solid $borderColor;
  border-radius: 4px;

  .katex-display {
    margin: 0;
  }
}

:global(.#{$namespace}-latex-template-item-raw) {
  display: block;
  width: 100%;
  min-width: 0;
  font-family:
    ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12px;
  color: $dangerColor;
  overflow-wrap: anywhere;
}
</style>
