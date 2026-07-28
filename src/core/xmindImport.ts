import type { MindData, MindNode } from './types'

/**
 * XMind (2020+/Zen) content.json → MindData
 * 结构：[{ rootTopic: { id, title, children: { attached: [...] }, href } }, ...]
 * 仅取第一个 sheet；图片资源在 zip 内（xap:resources/），暂不导入
 */
interface XmindTopic {
  id?: string
  title?: string
  href?: string
  children?: { attached?: XmindTopic[] }
}

interface XmindSheet {
  rootTopic?: XmindTopic
}

export function xmindToMind(contentJson: string): MindData {
  let sheets: unknown
  try {
    sheets = JSON.parse(contentJson)
  } catch {
    throw new Error('XMind 内容不是合法的 JSON')
  }

  const sheet = Array.isArray(sheets) ? (sheets[0] as XmindSheet | undefined) : undefined
  if (!sheet?.rootTopic) {
    throw new Error('XMind 文件缺少根主题（仅支持 XMind 2020+ 格式）')
  }

  return { nodeData: convertTopic(sheet.rootTopic, 'root') }
}

let seq = 0

function convertTopic(topic: XmindTopic, fallbackId: string): MindNode {
  const node: MindNode = {
    id: topic.id || `${fallbackId}-${++seq}`,
    topic: topic.title?.trim() || '未命名主题',
  }
  if (topic.href) node.hyperLink = topic.href

  const attached = topic.children?.attached
  if (attached?.length) {
    node.children = attached.map((child, i) => convertTopic(child, `${node.id}-${i}`))
  }
  return node
}
