import { config, enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { FormRender } from '@/components'
import ObjInitialValues from '@/components/customComponents/ObjInitialValues.vue'
import { $designInstance } from '@/symbol'
import type { FormSchema } from '@/types'
import AntdvNextAdapter from '@/uiAdapter/AntdvNextAdapter'
import { FormDesignTest, wait } from '@/utils'

config.global.components = {
  ...config.global.components,
  'FormDesign-ObjInitialValues': ObjInitialValues
}

enableAutoUnmount(afterEach)

const lengthField = {
  label: '长度',
  name: 'length',
  component: 'InputNumber',
  componentProps: {
    unitEnabled: true,
    unitCategory: '长度',
    defaultUnit: 'cm'
  }
}

const weightField = {
  label: '重量',
  name: 'weight',
  component: 'InputNumber',
  componentProps: {
    unitEnabled: true,
    unitCategory: '重量',
    defaultUnit: 'kg'
  }
}

const getBodyButtons = (selector: string) =>
  Array.from(document.body.querySelectorAll<HTMLButtonElement>(selector))

const chooseUnit = async (wrapper: VueWrapper, buttonIndex: number, unitText: string) => {
  const buttons = wrapper.findAll('.vfc-input-number-unit-btn')

  expect(buttons[buttonIndex]).toBeDefined()

  await buttons[buttonIndex].trigger('click')
  await nextTick()
  await wait(150)

  const option = getBodyButtons('.vfc-input-number-unit-option').find(
    (button) => button.textContent?.trim() === unitText
  )

  expect(option).toBeDefined()

  option!.click()
  await nextTick()
  await wait(100)
}

describe('容器单位联动', () => {
  it('对象容器开启单位联动后，同分类单位的数字组件同步切换', async () => {
    const schema: FormSchema = {
      labelWidth: 100,
      initialValues: {
        obj: {
          length: 100,
          length_unit: 'cm',
          width: 50,
          width_unit: 'cm',
          weight: 2,
          weight_unit: 'kg'
        }
      },
      items: [
        {
          component: 'ObjGroup',
          name: 'obj',
          componentProps: {
            unitLinkage: true
          },
          items: [
            lengthField,
            {
              label: '宽度',
              name: 'width',
              component: 'InputNumber',
              componentProps: {
                unitEnabled: true,
                unitCategory: '长度',
                defaultUnit: 'cm'
              }
            },
            weightField
          ]
        }
      ]
    }

    const wrapper = mount(FormRender, { props: { schema } })

    await nextTick()
    await wait(100)

    await chooseUnit(wrapper, 0, '米m')

    expect(wrapper.vm.getFieldValue('obj.length_unit')).toBe('m')
    expect(wrapper.vm.getFieldValue('obj.width_unit')).toBe('m')
    // 不同分类不支持该单位，保持原单位
    expect(wrapper.vm.getFieldValue('obj.weight_unit')).toBe('kg')
  })

  it('对象容器关闭单位联动时互不影响', async () => {
    const schema: FormSchema = {
      labelWidth: 100,
      initialValues: {
        obj: {
          length: 100,
          length_unit: 'cm',
          width: 50,
          width_unit: 'cm'
        }
      },
      items: [
        {
          component: 'ObjGroup',
          name: 'obj',
          componentProps: {
            unitLinkage: false
          },
          items: [
            lengthField,
            {
              label: '宽度',
              name: 'width',
              component: 'InputNumber',
              componentProps: {
                unitEnabled: true,
                unitCategory: '长度',
                defaultUnit: 'cm'
              }
            }
          ]
        }
      ]
    }

    const wrapper = mount(FormRender, { props: { schema } })

    await nextTick()
    await wait(100)

    await chooseUnit(wrapper, 0, '米m')

    expect(wrapper.vm.getFieldValue('obj.length_unit')).toBe('m')
    expect(wrapper.vm.getFieldValue('obj.width_unit')).toBe('cm')
  })

  it('自增容器开启单位联动后，各行同分类单位同步切换', async () => {
    const schema: FormSchema = {
      labelWidth: 100,
      initialValues: {
        rows: [
          { length: 100, length_unit: 'cm' },
          { length: 200, length_unit: 'cm' }
        ]
      },
      items: [
        {
          component: 'FormList',
          name: 'rows',
          componentProps: {
            mode: 'table',
            minLines: 2,
            unitLinkage: true
          },
          items: [lengthField]
        }
      ]
    }

    const wrapper = mount(FormRender, { props: { schema } })

    await nextTick()
    await wait(200)

    await chooseUnit(wrapper, 0, '米m')

    expect(wrapper.vm.getFieldValue('rows.0.length_unit')).toBe('m')
    expect(wrapper.vm.getFieldValue('rows.1.length_unit')).toBe('m')
  })
})

describe('对象容器初始数据', () => {
  it('初始数据会补齐缺失字段，已有表单初始值优先', async () => {
    const schema: FormSchema = {
      labelWidth: 100,
      initialValues: {
        obj: {
          name: '已有姓名',
          address: {
            country: '中国'
          }
        }
      },
      items: [
        {
          component: 'ObjGroup',
          name: 'obj',
          componentProps: {
            initialData: () => ({
              name: '默认姓名',
              age: 18,
              address: {
                city: '上海'
              }
            })
          },
          items: [
            { label: '姓名', name: 'name', component: 'Input' },
            { label: '年龄', name: 'age', component: 'InputNumber' },
            {
              component: 'ObjGroup',
              name: 'address',
              items: [
                { label: '城市', name: 'city', component: 'Input' },
                { label: '国家', name: 'country', component: 'Input' }
              ]
            }
          ]
        }
      ]
    }

    const wrapper = mount(FormRender, { props: { schema } })

    await nextTick()
    await wait(100)

    expect(wrapper.vm.getFieldValue('obj.name')).toBe('已有姓名')
    expect(wrapper.vm.getFieldValue('obj.age')).toBe(18)
    expect(wrapper.vm.getFieldValue('obj.address.city')).toBe('上海')
    expect(wrapper.vm.getFieldValue('obj.address.country')).toBe('中国')
  })

  it('表单中没有对象数据时会创建对象初始数据', async () => {
    const schema: FormSchema = {
      labelWidth: 100,
      items: [
        {
          component: 'ObjGroup',
          name: 'obj',
          componentProps: {
            initialData: () => ({
              name: '张三',
              age: 20
            })
          },
          items: [
            { label: '姓名', name: 'name', component: 'Input' },
            { label: '年龄', name: 'age', component: 'InputNumber' }
          ]
        }
      ]
    }

    const wrapper = mount(FormRender, { props: { schema } })

    await nextTick()
    await wait(100)

    expect(wrapper.vm.getFieldValue('obj.name')).toBe('张三')
    expect(wrapper.vm.getFieldValue('obj.age')).toBe(20)
  })
})

describe.each([
  ['FormList', false],
  ['ObjGroup', true]
])('%s 属性面板', (menuName, hasInitialData) => {
  it('显示单位联动开关并正确写回属性', async () => {
    const { rightWrapper, dblclickAdd, clickItem, schema } = FormDesignTest(AntdvNextAdapter)

    await dblclickAdd(menuName)
    await clickItem()
    await wait(100)

    expect(rightWrapper.text()).toContain('单位联动')

    if (hasInitialData) {
      expect(rightWrapper.text()).toContain('初始数据')
    }

    const linkageItem = rightWrapper
      .findAll('.ant-form-item')
      .find((item) => item.find('.ant-form-item-label').text().includes('单位联动'))

    expect(linkageItem).toBeDefined()
    expect(schema.value.items?.[0]?.componentProps?.unitLinkage).toBe(false)

    await linkageItem!.find('.ant-switch').trigger('click')
    await wait(200)

    expect(schema.value.items?.[0]?.componentProps?.unitLinkage).toBe(true)
  })
})

describe('对象初始数据编辑器', () => {
  it('可编辑对象容器内字段并保存初始数据', async () => {
    const designInstance = {
      getCurrentKey: () => 'obj',
      getNodeByKey: () => ({
        component: 'ObjGroup',
        name: 'obj',
        items: [{ label: '姓名', name: 'name', component: 'Input', designKey: 'name-key' }]
      })
    } as any

    const wrapper = mount(ObjInitialValues, {
      props: {
        modelValue: {},
        'onUpdate:modelValue': () => { }
      },
      global: {
        provide: {
          [$designInstance]: designInstance
        }
      }
    })

    await wrapper.find('button').trigger('click')
    await nextTick()
    await wait(100)

    const input = document.body.querySelector<HTMLInputElement>('.el-dialog .el-input__inner')

    expect(input).not.toBeNull()

    input!.value = '张三'
    input!.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()

    const saveButton = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('.el-dialog__footer button')
    ).find((button) => button.textContent?.trim() === '保存')

    expect(saveButton).toBeDefined()

    saveButton!.click()
    await nextTick()
    await wait(100)

    const emitted = wrapper.emitted('update:modelValue')

    expect(emitted).toBeDefined()
    expect(emitted![emitted!.length - 1][0]).toMatchObject({ name: '张三' })
  })
})
