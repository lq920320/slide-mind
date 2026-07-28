import { CoreError } from './errors'
import type { MindData, MindNode } from './types'

/**
 * Markdown 大纲 ↔ 导图（参考 markmap 的层级映射思路）：
 * - `#` 根节点，`##` 一级分支，`###` 及更深标题继续下钻
 * - 无序列表项（-/*，2 空格一层缩进）挂在最近的标题之下
 * - 内联标记：`[文字](url)` → hyperLink，`![alt](url)` → alt 文字；
 *   `**`/`` ` ``等格式符号保留原文，由渲染层（renderInlineMarkdown）展示
 */

interface InlineParsed {
  topic: string
  hyperLink?: string
}

/** 提取链接/图片结构语义；格式符号保留交给渲染层 */
function parseInline(raw: string): InlineParsed {
  let text = raw.trim()

  // 图片保留 alt 文字；链接保留文字并取首个 url
  let hyperLink: string | undefined
  text = text.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, '$1')
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, url: string) => {
    hyperLink ??= url
    return label
  })

  return { topic: text.trim(), hyperLink }
}

/** 由内联解析结果构建节点 */
function createNode(raw: string): MindNode {
  const { topic, hyperLink } = parseInline(raw)
  const node: MindNode = { id: nextId(), topic }
  if (hyperLink) node.hyperLink = hyperLink
  return node
}

export function mindToMarkdown(mind: MindData): string {
  const lines: string[] = []
  const walk = (node: MindNode, depth: number) => {
    if (depth <= 2) {
      lines.push(`${'#'.repeat(depth + 1)} ${node.topic}`)
      if (depth < 2) lines.push('')
    } else {
      lines.push(`${'  '.repeat(depth - 3)}- ${node.topic}`)
    }
    const children = node.children ?? []
    children.forEach((child) => walk(child, depth + 1))
    if (depth === 2 && children.length) lines.push('')
  }
  walk(mind.nodeData, 0)
  return `${lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`
}

let seq = 0

function nextId(): string {
  return `md-${++seq}`
}

export function markdownToMind(markdown: string): MindData {
  const lines = markdown.split(/\r?\n/)
  let root: MindNode | null = null
  /** 各深度当前挂载点（headingStack[d] = 深度 d 的最新节点） */
  const stack: MindNode[] = []
  /** 列表项相对锚点（最近一个标题节点） */
  let listAnchor: MindNode | null = null

  const attach = (parent: MindNode, node: MindNode) => {
    ;(parent.children ??= []).push(node)
  }

  for (const rawLine of lines) {
    const heading = /^(#{1,6})\s+(.+)$/.exec(rawLine.trim())
    if (heading) {
      const depth = heading[1].length - 1
      const node = createNode(heading[2])
      if (depth === 0 && !root) {
        root = node
      } else if (root) {
        const parent = stack[Math.min(depth, stack.length) - 1] ?? root
        attach(parent, node)
      } else {
        // 首个标题不是 # 时，将其视为根
        root = node
      }
      stack.length = depth
      stack[depth] = node
      listAnchor = node
      continue
    }

    const item = /^(\s*)[-*]\s+(.+)$/.exec(rawLine)
    if (item && listAnchor) {
      const indent = Math.floor(item[1].length / 2)
      const node = createNode(item[2])
      // 沿锚点向下按缩进找父节点（取各层最后一个子节点）
      let parent = listAnchor
      for (let i = 0; i < indent; i++) {
        const last = parent.children?.[parent.children.length - 1]
        if (!last) break
        parent = last
      }
      attach(parent, node)
    }
  }

  if (!root) throw new CoreError('markdownNoHeading')
  return { nodeData: root }
}
