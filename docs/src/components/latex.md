# LaTeX 公式（Latex）

基于 [KaTeX](https://katex.org/) 的 Vue 3 公式组件，用于在表单中展示数学公式，也可以作为可编辑的公式字段使用。

- 仅支持 Vue 3
- 公式渲染由 KaTeX 完成，无需额外安装或引入样式
- 默认只读展示；开启 `editable` 后公式右侧显示编辑按钮，点击后才展开输入框，确定后写入表单数据
- 支持配置多个公式模板，编辑时可通过输入框后缀按钮弹层预览并选取模板
- 支持 KaTeX 的 `macros`、`displayMode`、`errorColor` 等常用选项

## 基础用法

`component: 'Latex'`，通过 `componentProps.expression` 配置公式：

```json
{
  "label": "勾股定理",
  "name": "theorem",
  "component": "Latex",
  "componentProps": {
    "expression": "a^2 + b^2 = c^2",
    "displayMode": true,
    "fontSize": 20
  }
}
```

`expression` 也支持表达式语法，可以根据表单数据动态生成公式：

```json
{
  "label": "动态公式",
  "name": "dynamicFormula",
  "component": "Latex",
  "componentProps": {
    "expression": "{{ $values.a }}^2 + {{ $values.b }}^2"
  }
}
```

## 可编辑公式

开启 `editable` 后，组件默认仍只展示公式，只在公式右侧显示编辑按钮。点击编辑按钮后才会展开输入框；如果配置了 `templates`，输入框后缀会显示模板选取按钮。编辑时公式会实时预览，点击「确定」才会把草稿写入表单字段并收起输入框，点击「取消」或按 `Esc` 则放弃本次修改。

```json
{
  "initialValues": {
    "formula": "\\frac{a}{b}"
  },
  "items": [
    {
      "label": "数学公式",
      "name": "formula",
      "component": "Latex",
      "componentProps": {
        "editable": true,
        "displayMode": true,
        "placeholder": "请输入 LaTeX 公式"
      }
    }
  ]
}
```

> 在可编辑模式下，如果字段值为空，组件会优先把 `componentProps.expression` 作为空值时的展示内容。业务表单的初始值建议统一使用 `FormSchema.initialValues`。

## 公式模板

配置 `templates` 后，展开编辑框时输入框后缀会出现模板选取按钮。点击按钮会弹出模板列表，同时展示模板名称和公式的渲染效果；模板项以块级列表显示，模板较多时会在弹层内滚动。点击任意模板会把对应公式填入输入框并实时预览，点击「确定」后才会保存到表单字段，填入后仍然可以继续修改公式。

```json
{
  "label": "数学公式",
  "name": "formula",
  "component": "Latex",
  "componentProps": {
    "editable": true,
    "templates": [
      { "label": "分式", "expression": "\\frac{a}{b}" },
      { "label": "根式", "expression": "\\sqrt{x}" },
      { "label": "求和", "expression": "\\sum_{i=1}^{n} i" }
    ]
  }
}
```

在设计器属性面板的「公式模板」区域可以增删多个模板，每个模板包含「模板名称」和「公式内容」。

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `expression` | `string` | `''` | 静态公式；可编辑模式下作为空值时的展示内容 |
| `editable` | `boolean` | `false` | 是否显示编辑按钮，允许终端用户编辑公式 |
| `templates` | `{ label?: string; expression: string }[]` | `[]` | 编辑时可选取的公式模板 |
| `displayMode` | `boolean` | `false` | 对应 KaTeX 的 `displayMode`，块级公式会独占一行并居中 |
| `fontSize` / `fontsize` | `number` | `16` | 公式字号（px） |
| `placeholder` | `string` | `请输入 LaTeX 公式` | 编辑框占位提示 |
| `emptyText` | `string` | - | 没有公式时的空状态文案 |
| `disabled` | `boolean` | `false` | 是否禁用编辑；为 `true` 时不显示编辑按钮 |
| `readonly` | `boolean` | `false` | 是否只读编辑；为 `true` 时不显示编辑按钮 |
| `showError` | `boolean` | `true` | 公式解析失败时是否展示错误信息 |
| `errorColor` | `string` | `#cc0000` | KaTeX 错误源码的显示颜色 |
| `minRuleThickness` | `number` | `0.04` | KaTeX 分数线最小粗细 |
| `macros` | `Record<string, string>` | - | KaTeX 宏定义 |
| `strict` | `boolean \| 'ignore' \| 'warn' \| 'error'` | `'warn'` | KaTeX 严格模式 |
| `minRows` | `number` | `2` | 编辑框最小行数 |
| `maxRows` | `number` | `10` | 编辑框最大行数 |

## 设计器配置

在设计器左侧「高级组件」中双击「LaTeX 公式」即可添加到画布。右侧属性面板支持配置：

- 静态公式、是否允许编辑
- 块级展示、字号
- 占位提示、是否展示解析错误
- 校验规则与表单联动

## 安全说明

组件内部使用 KaTeX 生成 HTML，并通过 `v-html` 渲染公式。KaTeX 默认关闭 `trust`（组件内部固定为 `trust: false`），不会执行公式中的 HTML 或脚本。公式内容来自表单配置或用户输入时，仍然建议在业务侧对来源做必要约束。
