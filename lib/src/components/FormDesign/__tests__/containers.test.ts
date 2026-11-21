import { describe, expect, it } from 'vitest'
import { FormDesignTest, ns, wait } from '@/utils'

describe('《表单设计器》嵌套容器测试', () => {
  it('Tabs 新增第 3 个选项卡后具备可拖拽容器', async () => {
    const { wrapper, items, dblclickAdd, rightWrapper, centerWrapper } = FormDesignTest()

    await dblclickAdd('Tabs')

    const tabsNode = items.value![0]!

    expect(tabsNode.items).toHaveLength(2)

    wrapper.vm.setCurrentKey(tabsNode.designKey!)

    await wait(300)

    const addBtn = rightWrapper.find(`.${ns('formList')} .list-btn.addBtn`)

    expect(addBtn.exists()).toBe(true)

    await addBtn.trigger('click')

    await wait(300)

    const newTab = tabsNode.items?.[2]

    expect(tabsNode.items).toHaveLength(3)
    expect(newTab).toMatchObject({
      label: '选项卡3',
      name: 'name3',
      component: 'TabPane',
      items: []
    })
    expect(newTab?.designKey).toBeTruthy()

    // 打开新增选项卡，确认画布中已经渲染对应的拖拽容器
    await centerWrapper.findAll('.el-tabs__item')[2].trigger('click')
    await wait(100)

    const canvasGroup = wrapper
      .findAllComponents({ name: 'CanvasGroup' })
      .find((group) => group.props('designKey') === newTab?.designKey)

    expect(canvasGroup).toBeTruthy()
  })

  it('Collapse 新增第 3 个面板后具备可拖拽容器', async () => {
    const { wrapper, items, dblclickAdd, rightWrapper } = FormDesignTest()

    await dblclickAdd('Collapse')

    const collapseNode = items.value![0]!

    expect(collapseNode.items).toHaveLength(2)

    wrapper.vm.setCurrentKey(collapseNode.designKey!)

    await wait(300)

    const addBtn = rightWrapper.find(`.${ns('formList')} .list-btn.addBtn`)

    expect(addBtn.exists()).toBe(true)

    await addBtn.trigger('click')

    await wait(300)

    const newItem = collapseNode.items?.[2]

    expect(collapseNode.items).toHaveLength(3)
    expect(newItem).toMatchObject({
      label: '面板3',
      name: 'name3',
      component: 'CollapseItem',
      componentProps: { checked: false },
      items: []
    })
    expect(newItem?.designKey).toBeTruthy()
  })
})
