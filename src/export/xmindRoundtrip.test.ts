import { describe, expect, it } from 'vitest'
import { data2Xmind } from '@mind-elixir/export-xmind'
import JSZip from 'jszip'
import type { MindElixirData } from 'mind-elixir'
import { xmindToMind } from '@/core/xmindImport'

/**
 * XMind 导出（@mind-elixir/export-xmind）↔ 导入（xmindToMind）往返回归：
 * 保证我们导出的 .xmind 结构始终能被自己的导入器读回。
 */
const sample = {
  nodeData: {
    id: 'root',
    topic: '产品规划',
    children: [
      { id: 'a', topic: '功能', children: [{ id: 'a1', topic: '导图编辑' }] },
      { id: 'b', topic: '发布', hyperLink: 'https://example.com' },
    ],
  },
} as unknown as MindElixirData

describe('XMind 导出↔导入往返', () => {
  it('zip 含标准三文件，content.json 可被导入器读回且拓扑一致', async () => {
    // data2Xmind 会原地修改数据，传拷贝
    const blob = await data2Xmind(JSON.parse(JSON.stringify(sample)) as MindElixirData)
    // jsdom 的 Blob 无 arrayBuffer()，用 FileReader 读取
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(blob)
    })
    const zip = await JSZip.loadAsync(buffer)

    expect(Object.keys(zip.files).sort()).toEqual(
      expect.arrayContaining(['content.json', 'manifest.json', 'metadata.json']),
    )

    const content = await zip.file('content.json')!.async('string')
    const mind = xmindToMind(content)

    expect(mind.nodeData.topic).toBe('产品规划')
    expect(mind.nodeData.children?.map((c) => c.topic)).toEqual(['功能', '发布'])
    expect(mind.nodeData.children?.[0].children?.[0].topic).toBe('导图编辑')
  })
})
