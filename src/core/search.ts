import type { MindNode } from './types'

/** 搜索结果：命中的节点及其从根到该节点的路径 */
export interface NodeMatch {
  id: string
  topic: string
  /** 祖先路径，如 ['根主题', '一级分支'] */
  path: string[]
}

/** 在导图树中按关键字（不区分大小写）搜索节点 */
export function searchNodes(root: MindNode, keyword: string, limit = 20): NodeMatch[] {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return []

  const matches: NodeMatch[] = []
  const walk = (node: MindNode, path: string[]) => {
    if (matches.length >= limit) return
    if (node.topic.toLowerCase().includes(kw)) {
      matches.push({ id: node.id, topic: node.topic, path })
    }
    for (const child of node.children ?? []) {
      walk(child, [...path, node.topic])
    }
  }
  walk(root, [])
  return matches
}
