# FormDesign 表单设计器

## 简介

FormDesign 是 vue-form-craft 的可视化表单设计器组件。

建议将设计器渲染在一个大的容器里！

```vue
<template>
  <div style="width:100vw;height:100vh">
    <FormDesign />
  </div>
</template>
```

## 预览

点击右上角的「预览」按钮可以打开当前表单的预览弹窗。预览支持在 `PC`、平板（`768px`）和移动端（`375px`）三种模式之间切换，方便检查不同屏幕宽度下的表单布局。

## Props

| 参数名        | 类型         | 默认值 | 描述                                       |
| ------------- | ------------ | ------ | ------------------------------------------ |
| v-model       | `FormSchema` | -      | 设计器的JsonSchema数据，双向绑定           |
| schemaContext | `object`     | -      | JsonSchema自定义的 [联动变量](/linkage) |
| omitMenus     | `string[]`   | []     | 隐藏左侧组件key数组                        |

## Events

| 事件名 | 类型                          | 描述                   |
| ------ | ----------------------------- | ---------------------- |
| save   | `()=>void`                    | 点击保存按钮时触发     |
| add    | `(element:FormElement)=>void` | 拖拽组件到画布上时触发 |
