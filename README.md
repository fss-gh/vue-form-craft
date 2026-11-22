# Vue Form Craft

AI 驱动的 Vue3 表单工具，核心由 `FormDesign`（可视化设计器） + `FormRender`（Schema 渲染器）组成。

- 在线体验: https://elin521.cn:3006/form-design.html
- 文档: https://elin521.cn:3006/

## 核心能力

- 可视化拖拽生成表单 `JsonSchema`
- 用 `FormRender` 直接渲染 `JsonSchema`
- 支持复杂联动（JS 表达式 + data/attr 联动）
- 支持数组字段收集（`FormList`）和深层嵌套
- 支持校验规则（`required/min/max/pattern/builtin/custom/jsExpr`）
- 可选 VeeValidate 校验引擎，Schema 与使用方式保持兼容
- 支持 AI 辅助生成/修改表单 Schema
- 支持扩展组件与多 UI 适配器（Element Plus / Antdv Next）

## 项目结构

这是一个 `pnpm workspace` 仓库：

- `lib`: 核心库源码（npm 包 `vue-form-craft`）
- `play`: 本地调试 playground
- `docs`: VitePress 文档站

## 在业务项目中使用

### 1. 安装

```bash
npm i vue-form-craft
```

### 2. 全局注册

默认使用 Element Plus 适配器（需自行安装并注册 Element Plus）：

```ts
import ElementPlus from 'element-plus'
import { createApp } from 'vue'
import VueFormCraft from 'vue-form-craft'
import 'element-plus/dist/index.css'
import App from './App.vue'

const app = createApp(App)

app.use(ElementPlus)
app.use(VueFormCraft)
app.mount('#app')
```

如需切换为 Antdv Next（需自行安装 `antdv-next`）：

```bash
npm i antdv-next
```

```ts
import { AntdvNextAdapter } from 'vue-form-craft'

app.use(VueFormCraft, {
  ui: AntdvNextAdapter
})
```

#### 可选：VeeValidate 校验引擎

默认使用各 UI 库 Form/FormItem 的原生校验。需要 VeeValidate 时，可全局开启：

```ts
app.use(VueFormCraft, {
  validationEngine: 'vee-validate'
})
```

也可以只对单个表单开启或覆盖全局配置：

```ts
const schema: FormSchema = {
  validationEngine: 'vee-validate',
  items: [
    {
      label: '用户名',
      name: 'username',
      component: 'Input',
      required: true
    }
  ]
}
```

`required` / `rules` / `trigger` 的配置写法不变，`validate()`、`submit()`、`resetFields()` 的调用方式也不变。`vee-validate` 已随框架安装；使用 UMD/CDN 方式引入时，需要额外提供 `VeeValidate` 全局变量。

### 3. 使用 `FormRender`

```vue
<template>
  <FormRender v-model="formValues" :schema="schema" @finish="onFinish" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FormSchema } from 'vue-form-craft'

const formValues = ref({})

const schema: FormSchema = {
  labelWidth: 150,
  labelAlign: 'right',
  size: 'default',
  submitBtn: true,
  items: [
    {
      label: '用户名',
      name: 'username',
      component: 'Input',
      required: true,
      componentProps: {
        placeholder: '请输入用户名'
      }
    },
    {
      label: '密码',
      name: 'password',
      component: 'Password',
      required: true,
      componentProps: {
        placeholder: '请输入密码'
      }
    }
  ]
}

const onFinish = () => {
  alert(JSON.stringify(formValues.value, null, 2))
}
</script>
```

### 4. 使用 `FormDesign`

```vue
<template>
  <div style="width: 100vw; height: 100vh">
    <FormDesign />
  </div>
</template>
```

## AI 接入（可选）

通过 `app.use(VueFormCraft, { ai })` 注入一个通用函数即可：

```ts
import axios from 'axios'
import VueFormCraft from 'vue-form-craft'

const ai = async ({ prompt, signal }) => {
  try {
    const res = await axios.post(
      '/api/ai/v1/chat/completions', // nginx代理实际请求地址，防止暴露apiKey
      {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      },
      {
        signal
      }
    )

    const content = res?.data?.choices?.[0]?.message?.content

    // 原样返回AI生成的文本内容
    return content
  } catch (error) {
    throw new Error('AI生成失败')
  }
}

app.use(VueFormCraft, { ai })
```

## 开发仓库

```bash
# playground
pnpm dev

# 构建库
pnpm build

# 单元测试
pnpm test

# 文档站
pnpm docs:dev
pnpm docs:build
```
