import { describe, expect, it } from 'vitest'
import { createEmptyDocument, parseDocument, serializeDocument } from './smind'

describe('smind 文档格式', () => {
  it('创建的空白文档可通过序列化-解析往返', () => {
    const doc = createEmptyDocument('测试')
    const restored = parseDocument(serializeDocument(doc))
    expect(restored.version).toBe(1)
    expect(restored.mindmap.nodeData.topic).toBe('测试')
    expect(restored.slides).toBeNull()
  })

  it('序列化时标题跟随根节点 topic', () => {
    const doc = createEmptyDocument('旧标题')
    doc.mindmap.nodeData.topic = '新标题'
    const restored = parseDocument(serializeDocument(doc))
    expect(restored.meta.title).toBe('新标题')
  })

  it('非法 JSON 报错', () => {
    expect(() => parseDocument('{oops')).toThrow('文件不是合法的 JSON')
  })

  it('版本不支持时报错', () => {
    expect(() => parseDocument(JSON.stringify({ version: 99 }))).toThrow('不支持的文件版本')
  })

  it('缺少导图数据时报错', () => {
    expect(() => parseDocument(JSON.stringify({ version: 1, mindmap: {} }))).toThrow(
      '文件缺少有效的思维导图数据',
    )
  })
})
