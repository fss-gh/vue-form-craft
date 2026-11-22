# 数字输入框（InputNumber）

## 组件标识

`component: 'InputNumber'`

## componentProps

| 参数名 | 类型 | 说明 |
| --- | --- | --- |
| disabled | `boolean` | 禁用 |
| readonly | `boolean` | 只读 |
| min | `number` | 最小值 |
| max | `number` | 最大值 |
| step | `number` | 步长 |
| unitEnabled | `boolean` | 是否附带单位，开启后在数字输入框后缀显示单位选择按钮 |
| unitCategory | `string` | 单位分类，弹层默认展示该分类下的单位，默认单位也从该分类获取 |
| defaultUnit | `string` | 默认单位（单位 `value`），字段未设置单位时自动写入，需属于 `unitCategory` |
| unitData | `UnitCategory[]` | 自定义单位数据，默认使用内置单位 JSON |
| onChange | `(value: number \| undefined) => void` | 值变化 |
| onBlur | `(e: Event) => void` | 失焦 |
| onFocus | `(e: Event) => void` | 聚焦 |
| style | `Record<string, any>` | 自定义样式 |

## 单位

开启 `unitEnabled` 后，数字输入框后缀会出现单位选择按钮，按钮中显示当前单位的 `value`（例如 `cm`）。点击按钮可查看单位分类以及当前分类下的单位。组件默认展示 `unitCategory` 对应的分类，也可以切换到其他分类选取单位。单位数据默认从内置 JSON 加载，数据结构如下：

```json
[
  {
    "name": "长度",
    "units": [
      { "label": "毫米", "value": "mm", "multiplier": 1 },
      { "label": "厘米", "value": "cm", "multiplier": 10 },
      { "label": "米", "value": "m", "multiplier": 1000 }
    ]
  }
]
```

`multiplier` 表示当前单位换算到所属分类基准单位的倍数。在同一分类内切换单位时，组件会按换算倍数自动转换数字值。例如 `100 cm` 切换为 `m` 后，数字值会变为 `1`。

选中的单位不会保存到数字字段本身，而是固定保存到「字段标识 + `_unit`」对应的字段中：

```ts
{
  length: 100,
  length_unit: 'cm'
}
```

默认单位通过 `defaultUnit` 配置，其可选值来自 `unitCategory` 所选的单位分类。表单设计器中开启「附带单位」后才会显示「单位分类」和「默认单位」配置；切换分类时，不属于新分类的默认单位会被清空。如果表单数据中还没有对应单位，组件会自动将默认单位写入 `字段标识_unit`；默认单位不存在或不属于所选分类时不会写入。也可以通过 `unitData` 传入自定义单位 JSON 数据。
