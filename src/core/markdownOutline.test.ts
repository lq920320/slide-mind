import { describe, expect, it } from 'vitest'
import { CoreError } from './errors'
import { markdownToMind, mindToMarkdown } from './markdownOutline'
import type { MindData, MindNode } from './types'

const sample: MindData = {
  nodeData: {
    id: 'root',
    topic: '产品规划',
    children: [
      {
        id: 'a',
        topic: '功能',
        children: [
          {
            id: 'a1',
            topic: '导图编辑',
            children: [
              { id: 'a1x', topic: '快捷键', children: [{ id: 'a1x1', topic: 'Tab 子节点' }] },
            ],
          },
        ],
      },
      { id: 'b', topic: '发布' },
    ],
  },
}

/** 提取拓扑（仅 topic 树），用于往返比对 */
function topics(node: MindNode): unknown {
  return { topic: node.topic, children: (node.children ?? []).map(topics) }
}

describe('mindToMarkdown', () => {
  it('根/一级/二级映射为标题，更深层映射为缩进列表', () => {
    const md = mindToMarkdown(sample)
    expect(md).toContain('# 产品规划')
    expect(md).toContain('## 功能')
    expect(md).toContain('### 导图编辑')
    expect(md).toContain('- 快捷键')
    expect(md).toContain('  - Tab 子节点')
  })
})

describe('markdownToMind', () => {
  it('与 mindToMarkdown 往返后拓扑一致', () => {
    const restored = markdownToMind(mindToMarkdown(sample))
    expect(topics(restored.nodeData)).toEqual(topics(sample.nodeData))
  })

  it('首个标题非 # 时容错为根节点', () => {
    const mind = markdownToMind('## 直接二级\n- 点 A')
    expect(mind.nodeData.topic).toBe('直接二级')
    expect(mind.nodeData.children?.[0].topic).toBe('点 A')
  })

  it('支持 * 列表符与空行穿插', () => {
    const mind = markdownToMind('# R\n\n## C\n\n* x\n\n* y')
    expect(mind.nodeData.children?.[0].children?.map((n) => n.topic)).toEqual(['x', 'y'])
  })

  it('无任何标题时抛 markdownNoHeading', () => {
    try {
      markdownToMind('只有正文，没有标题')
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(CoreError)
      expect((e as CoreError).code).toBe('markdownNoHeading')
    }
  })

  it('格式符号保留原文（由渲染层展示，导出时不丢失）', () => {
    const mind = markdownToMind('# R\n## **重点章节**\n- 使用 `pnpm dev` 启动')
    const section = mind.nodeData.children?.[0]
    expect(section?.topic).toBe('**重点章节**')
    expect(section?.children?.[0].topic).toBe('使用 `pnpm dev` 启动')
    // 导出时原样回写，往返不丢
    expect(mindToMarkdown(mind)).toContain('## **重点章节**')
  })

  it('链接保留文字并映射 hyperLink，图片保留 alt', () => {
    const mind = markdownToMind('# R\n## C\n- 参考 [官方文档](https://sli.dev) 和 ![架构图](a.png)')
    const item = mind.nodeData.children?.[0].children?.[0]
    expect(item?.topic).toBe('参考 官方文档 和 架构图')
    expect(item?.hyperLink).toBe('https://sli.dev')
  })
})
