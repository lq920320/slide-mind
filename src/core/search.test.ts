import { describe, expect, it } from 'vitest'
import { searchNodes } from './search'
import type { MindNode } from './types'

const tree: MindNode = {
  id: 'root',
  topic: '产品规划',
  children: [
    {
      id: 'a',
      topic: '功能设计',
      children: [
        { id: 'a1', topic: '导图编辑' },
        { id: 'a2', topic: '幻灯片演示' },
      ],
    },
    { id: 'b', topic: '设计规范' },
  ],
}

describe('searchNodes', () => {
  it('命中节点并返回祖先路径', () => {
    const result = searchNodes(tree, '导图')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'a1', path: ['产品规划', '功能设计'] })
  })

  it('不区分大小写且支持多命中', () => {
    expect(searchNodes(tree, '设计').map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('空关键字返回空数组', () => {
    expect(searchNodes(tree, '  ')).toEqual([])
  })

  it('结果数量受 limit 限制', () => {
    expect(searchNodes(tree, '设计', 1)).toHaveLength(1)
  })
})
