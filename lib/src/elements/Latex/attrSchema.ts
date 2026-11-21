import type { FormSchema } from 'vue-form-craft'

export default {
  labelWidth: 110,
  labelAlign: 'left',
  scrollToError: true,
  size: 'small',
  submitBtn: false,
  initialValues: {
    label: 'LaTeX 公式',
    componentProps: {
      expression: '\\frac{a}{b}',
      editable: false,
      displayMode: true,
      fontSize: 20,
      placeholder: '请输入 LaTeX 公式',
      showError: true,
      templates: []
    }
  },
  items: [
    {
      name: 'form-latex',
      component: 'Tabs',
      componentProps: {
        defaultKey: 'attrs',
        tabPosition: 'top',
        type: 'card'
      },
      items: [
        {
          label: '属性',
          name: 'attrs',
          component: 'TabPane',
          componentProps: {
            lazy: true
          },
          items: [
            {
              name: '.',
              component: 'Custom',
              componentProps: {
                componentName: 'FormDesign-Basic'
              },
              labelWidth: 0
            },
            {
              label: '静态公式',
              name: 'componentProps.expression',
              component: 'TextArea',
              labelAlign: 'top',
              componentProps: {
                autosize: {
                  minRows: 3,
                  maxRows: 8
                },
                placeholder: '例如：\\frac{a}{b}'
              },
              help: '支持 KaTeX 语法。可编辑模式下，公式值为空时会展示这里的内容'
            },
            {
              label: '允许编辑',
              name: 'componentProps.editable',
              component: 'Switch',
              help: '开启后公式右侧显示编辑按钮，点击后才展开输入框；确定后保存到表单字段'
            },
            {
              label: '公式模板',
              name: 'componentProps.templates',
              component: 'FormList',
              labelAlign: 'top',
              componentProps: {
                mode: 'card',
                title: '模板',
                minLines: 0,
                maxLines: 20,
                getNewItem: () => ({
                  label: '新模板',
                  expression: '\\frac{a}{b}'
                })
              },
              items: [
                {
                  label: '模板名称',
                  name: 'label',
                  component: 'Input',
                  componentProps: {
                    placeholder: '例如：分式'
                  }
                },
                {
                  label: '公式内容',
                  name: 'expression',
                  component: 'TextArea',
                  labelAlign: 'top',
                  componentProps: {
                    autosize: {
                      minRows: 2,
                      maxRows: 5
                    },
                    placeholder: '例如：\\frac{a}{b}'
                  }
                }
              ],
              help: '编辑公式时可从这些模板中快速填入公式，填入后仍可继续修改'
            },
            {
              label: '块级展示',
              name: 'componentProps.displayMode',
              component: 'Switch',
              help: '对应 KaTeX 的 displayMode，开启后公式独占一行并居中显示'
            },
            {
              label: '字号（px）',
              name: 'componentProps.fontSize',
              component: 'InputNumber',
              componentProps: {
                min: 12,
                max: 72,
                step: 1,
                unit: 'px'
              }
            },
            {
              label: '占位提示',
              name: 'componentProps.placeholder',
              component: 'Input',
              componentProps: {
                placeholder: '请输入 LaTeX 公式',
                clearable: true
              }
            },
            {
              label: '显示解析错误',
              name: 'componentProps.showError',
              component: 'Switch'
            }
          ]
        },
        {
          label: '校验',
          name: 'rules',
          component: 'TabPane',
          componentProps: {
            lazy: true
          },
          items: [
            {
              name: '.',
              component: 'Custom',
              componentProps: {
                componentName: 'FormDesign-Rules'
              },
              labelWidth: 0
            }
          ]
        },
        {
          label: '联动',
          name: 'linkages',
          component: 'TabPane',
          componentProps: {
            lazy: true
          },
          items: [
            {
              name: '.',
              component: 'Custom',
              componentProps: {
                componentName: 'FormDesign-Linkages'
              },
              labelWidth: 0
            }
          ]
        }
      ]
    }
  ]
} satisfies FormSchema
