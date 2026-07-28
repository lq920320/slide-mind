import { describe, expect, it } from 'vitest'
import { xmindToMind } from './xmindImport'

const sample = JSON.stringify([
  {
    id: 'sheet1',
    title: 'Sheet 1',
    rootTopic: {
      id: 'r1',
      title: '产品规划',
      children: {
        attached: [
          {
            id: 'a',
            title: '功能',
            href: 'https://example.com',
            children: { attached: [{ id: 'a1', title: '导图' }] },
          },
          { id: 'b', title: '' },
        ],
      },
    },
  },
  { id: 'sheet2', rootTopic: { id: 'x', title: '第二张画布' } },
])

describe('xmindToMind', () => {
  it('解析根主题与嵌套子主题', () => {
    const mind = xmindToMind(sample)
    expect(mind.nodeData.topic).toBe('产品规划')
    expect(mind.nodeData.children?.[0].children?.[0].topic).toBe('导图')
  })

  it('仅取第一个 sheet', () => {
    const mind = xmindToMind(sample)
    expect(mind.nodeData.id).toBe('r1')
  })

  it('href 映射为 hyperLink，空标题回退占位符', () => {
    const mind = xmindToMind(sample)
    expect(mind.nodeData.children?.[0].hyperLink).toBe('https://example.com')
    expect(mind.nodeData.children?.[1].topic).toBe('未命名主题')
  })

  it('缺失 id 时生成回退 id', () => {
    const mind = xmindToMind(JSON.stringify([{ rootTopic: { title: '无 id' } }]))
    expect(mind.nodeData.id).toBeTruthy()
  })

  it('非法 JSON 与缺少根主题时抛对应错误码', () => {
    expect(() => xmindToMind('{bad')).toThrow('xmindInvalidJson')
    expect(() => xmindToMind('[]')).toThrow('xmindMissingRoot')
  })
})
