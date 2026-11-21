# 数据校验

### 必填校验

如果字段只需要判断是否填写，直接设置`required: true`。
示例：

```json
{
  "label": "姓名",
  "name": "name",
  "component": "Input",
  "required": true
}
```

### 复杂校验

当字段需要更复杂的校验时，使用 `rules`。

> `FormRules` 类型定义

```ts
type RuleType =
  | 'required'
  | 'min'
  | 'max'
  | 'pattern'
  | 'builtin'
  | 'enum'
  | 'custom'
  | 'jsExpr'

type RuleItem = {
  type?: RuleType
  value?: any
  message?: string
  trigger?: 'blur' | 'change'
}

type FormRules = RuleItem[]
```

常见规则写法：

```json
[
  { "type": "min", "value": 6, "message": "长度不能小于6位", "trigger": "blur" },
  { "type": "pattern", "value": "^[a-zA-Z0-9_]+$", "message": "只能输入字母数字下划线" }
]
```

示例：下面是一个注册表单，每一项都使用了`rules`校验。

::: demo expand

demo/RuleDemo.vue

:::

## 校验引擎

框架默认使用当前 UI 库 Form/FormItem 的原生校验，因此已有的 Schema 和错误提示行为保持不变。

从 `5.0.0` 开始可选启用 [VeeValidate](https://vee-validate.logaretm.com/) 作为校验引擎。启用后：

- `required` / `rules` 的配置写法完全不变
- `trigger: 'blur' | 'change'` 仍然生效
- `validate()` / `submit()` / `resetFields()` 的使用方式不变
- 校验错误仍由当前 UI 适配器展示

### 按表单启用

```json
{
  "validationEngine": "vee-validate",
  "items": [
    {
      "label": "用户名",
      "name": "username",
      "component": "Input",
      "required": true
    }
  ]
}
```

### 全局默认启用

```ts
app.use(VueFormCraft, {
  validationEngine: 'vee-validate'
})
```

`FormSchema.validationEngine` 的优先级高于全局配置，可单独切回 `"native"`：

```json
{
  "validationEngine": "native"
}
```

> `vee-validate` 已作为框架依赖安装。使用 UMD/CDN 方式引入时，需要额外提供 `VeeValidate` 全局变量。
