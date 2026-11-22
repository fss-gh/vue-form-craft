import { enableAutoUnmount, mount, config } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { FormRender } from '@/components'
import UnitDefault from '@/components/customComponents/UnitDefault.vue'
import { $uiAdapter } from '@/symbol'
import type { FormSchema } from '@/types'
import type { UIAdapter } from '@/types/uiAdapter'
import AntdvNextAdapter from '@/uiAdapter/AntdvNextAdapter'
import { FormDesignTest, wait } from '@/utils'
import { getDefaultUnitOptionsByCategory } from '../units'

// 属性面板中的自定义组件依赖全局注册（真实使用中由 install 完成）
config.global.components = {
  ...config.global.components,
  'FormDesign-UnitDefault': UnitDefault
}

enableAutoUnmount(afterEach)

const createSchema = (
  componentProps: Record<string, any> = {},
  name = 'length'
): FormSchema => ({
  labelWidth: 100,
  labelAlign: 'right',
  items: [
    {
      label: '长度',
      name,
      component: 'InputNumber',
      componentProps
    }
  ]
})

const mountInputNumber = (initialValues: Record<string, any>, componentProps: Record<string, any>) =>
  mount(FormRender, {
    props: {
      schema: {
        ...createSchema(componentProps),
        initialValues
      }
    }
  })

const mountInputNumberWithAdapter = (
  adapter: UIAdapter,
  initialValues: Record<string, any>,
  componentProps: Record<string, any>
) =>
  mount(FormRender, {
    props: {
      schema: {
        ...createSchema(componentProps),
        initialValues
      }
    },
    global: {
      provide: {
        [$uiAdapter]: adapter
      }
    }
  })

const getBodyButtons = (selector: string) =>
  Array.from(document.body.querySelectorAll<HTMLButtonElement>(selector))

const findByText = (selector: string, text: string) =>
  getBodyButtons(selector).find((button) => button.textContent?.trim() === text)

describe('InputNumber 单位功能', () => {
  it('未开启单位时不显示单位按钮', async () => {
    const wrapper = mountInputNumber({ length: 10 }, {})

    await nextTick()

    expect(wrapper.find('.vfc-input-number-unit-btn').exists()).toBe(false)
    expect(wrapper.find('.vfc-input-number-unit').exists()).toBe(false)
  })

  it('开启单位后显示默认单位，并把单位写入字段标识 + _unit', async () => {
    const wrapper = mountInputNumber(
      { length: 100 },
      {
        unitEnabled: true,
        unitCategory: '长度',
        defaultUnit: 'cm'
      }
    )

    await nextTick()
    await wait(50)

    expect(wrapper.find('.vfc-input-number-unit-btn').text()).toContain('cm')
    expect(wrapper.vm.getFieldValue('length_unit')).toBe('cm')
    expect(wrapper.vm.getFieldValue('length')).toBe(100)
  })

  it('只读模式展示数字和单位', async () => {
    const wrapper = mount(FormRender, {
      props: {
        read: true,
        schema: {
          ...createSchema({
            unitEnabled: true,
            unitCategory: '长度',
            defaultUnit: 'cm'
          }),
          initialValues: {
            length: 100,
            length_unit: 'cm'
          }
        }
      }
    })

    await nextTick()

    expect(wrapper.find('.vfc-input-number-read').text()).toContain('100')
    expect(wrapper.find('.vfc-input-number-read-unit').text()).toContain('cm')
  })
})

describe('Antdv Next 下的 InputNumber 单位功能', () => {
  it('可通过后缀按钮选择分类和单位', async () => {
    const wrapper = mountInputNumberWithAdapter(AntdvNextAdapter, { length: 100, length_unit: 'cm' }, {
      unitEnabled: true,
      unitCategory: '长度',
      defaultUnit: 'cm'
    })

    await nextTick()

    expect(wrapper.find('.vfc-input-number-unit-btn').text()).toContain('cm')

    await wrapper.find('.vfc-input-number-unit-btn').trigger('click')
    await nextTick()
    await wait(150)

    const categories = getBodyButtons('.vfc-input-number-unit-category')
    expect(categories.length).toBeGreaterThan(0)

    const meterOption = findByText('.vfc-input-number-unit-option', '米m')
    expect(meterOption).toBeDefined()

    meterOption!.click()
    await nextTick()
    await wait(100)

    expect(wrapper.vm.getFieldValue('length_unit')).toBe('m')
    expect(wrapper.vm.getFieldValue('length')).toBe(1)
  })
})

describe('InputNumber 单位属性面板', () => {
  it('默认单位选项只包含所选分类下的单位', () => {
    expect(getDefaultUnitOptionsByCategory('长度')).toEqual([
      { label: '毫米 (mm)', value: 'mm' },
      { label: '厘米 (cm)', value: 'cm' },
      { label: '米 (m)', value: 'm' },
      { label: '千米 (km)', value: 'km' }
    ])
    expect(getDefaultUnitOptionsByCategory('')).toEqual([])
  })

  it('开启附带单位后才显示单位分类和默认单位，且默认单位跟随分类联动', async () => {
    const { rightWrapper, dblclickAdd, clickItem } = FormDesignTest()

    await dblclickAdd('InputNumber')
    await clickItem()

    const getAttrItem = (label: string) =>
      rightWrapper
        .findAll('.el-form-item')
        .find((item) => item.find('.el-form-item__label').text().includes(label))

    expect(rightWrapper.text()).not.toContain('单位分类')
    expect(rightWrapper.text()).not.toContain('默认单位')

    const unitEnabledItem = getAttrItem('附带单位')
    expect(unitEnabledItem).toBeDefined()

    await unitEnabledItem!.find('.el-switch').trigger('click')
    await wait(300)

    expect(rightWrapper.text()).toContain('单位分类')
    expect(rightWrapper.text()).toContain('默认单位')

    const categoryItem = getAttrItem('单位分类')
    const defaultUnitItem = getAttrItem('默认单位')
    expect(categoryItem).toBeDefined()
    expect(defaultUnitItem).toBeDefined()
    expect(defaultUnitItem!.text()).toContain('请先选择单位分类')

    await categoryItem!.find('.el-select').trigger('click')
    await wait(200)

    const lengthCategory = Array.from(
      document.body.querySelectorAll<HTMLElement>('.el-select-dropdown__item')
    ).find((item) => item.textContent?.trim() === '长度')

    expect(lengthCategory).toBeDefined()
    lengthCategory!.click()
    await wait(300)

    expect(defaultUnitItem!.text()).toContain('请选择默认单位')
  })

  it('Antdv Next 下开启附带单位后显示单位分类和默认单位', async () => {
    const { rightWrapper, dblclickAdd, clickItem } = FormDesignTest(AntdvNextAdapter)

    await dblclickAdd('InputNumber')
    await clickItem()

    expect(rightWrapper.text()).not.toContain('单位分类')

    const unitEnabledItem = rightWrapper
      .findAll('.ant-form-item')
      .find((item) => item.find('.ant-form-item-label').text().includes('附带单位'))

    expect(unitEnabledItem).toBeDefined()

    await unitEnabledItem!.find('.ant-switch').trigger('click')
    await wait(300)

    expect(rightWrapper.text()).toContain('单位分类')
    expect(rightWrapper.text()).toContain('默认单位')
  })
})
