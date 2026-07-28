import type {
  MindData,
  MindNode,
  SlideDoc,
  SlideLayout,
  SlidePage,
  SlidePageMeta,
  SlidesConfig,
  SlidesSection,
} from './types'

/**
 * 导图 → 幻灯片默认转换规则（见 doc/01-技术调研与方案选型.md §5.2）：
 * 1. 根节点（深度 0）→ 封面页（title）
 * 2. 一级分支（深度 1）→ 章节页（section）
 * 3. 二级节点（深度 2）→ 内容页（content），其子节点渲染为 bullets；含图片则为图片页（image）
 *
 * 编排信息（顺序、布局覆写、备注、隐藏、分支范围）存于 SlidesSection，
 * 内容始终由导图节点派生（single source of truth）。
 */

export function createSlidesSection(): SlidesSection {
  return { config: { theme: 'default', aspectRatio: '16/9', appearance: 'dark' }, pages: [] }
}

/** 兼容旧版 .smind：补齐缺失的 config 字段 */
function normalizeConfig(config: Partial<SlidesConfig> | undefined): SlidesConfig {
  return {
    theme: config?.theme ?? 'default',
    aspectRatio: config?.aspectRatio ?? '16/9',
    appearance: config?.appearance === 'light' ? 'light' : 'dark',
  }
}

function findNode(root: MindNode, id: string): MindNode | null {
  if (root.id === id) return root
  for (const child of root.children ?? []) {
    const hit = findNode(child, id)
    if (hit) return hit
  }
  return null
}

/** 以某节点为根，建立 id → { node, depth } 索引 */
function indexBranch(root: MindNode): Map<string, { node: MindNode; depth: number }> {
  const index = new Map<string, { node: MindNode; depth: number }>()
  const walk = (node: MindNode, depth: number) => {
    index.set(node.id, { node, depth })
    for (const child of node.children ?? []) walk(child, depth + 1)
  }
  walk(root, 0)
  return index
}

/** 按默认规则推导某节点的布局 */
export function defaultLayout(node: MindNode, depth: number): SlideLayout {
  if (depth === 0) return 'title'
  if (depth === 1) return 'section'
  return node.image ? 'image' : 'content'
}

/** 默认成页的节点 id 序列：根 → 各一级分支 → 其二级子节点 */
function defaultPageIds(root: MindNode): string[] {
  const ids = [root.id]
  for (const branch of root.children ?? []) {
    ids.push(branch.id)
    for (const node of branch.children ?? []) ids.push(node.id)
  }
  return ids
}

/** 解析编排段的实际幻灯片根节点；rootId 失效时回退到导图根 */
function resolveRoot(mind: MindData, section: SlidesSection): { root: MindNode; rootId?: string } {
  if (section.rootId) {
    const node = findNode(mind.nodeData, section.rootId)
    if (node) return { root: node, rootId: section.rootId }
  }
  return { root: mind.nodeData }
}

/**
 * 增量同步：导图变更后更新编排段，保留用户的顺序与覆写。
 * - 节点已删除的页被移除
 * - 新增节点按默认序插入到「默认序中前一个仍存在的页」之后
 */
export function syncSlides(mind: MindData, section: SlidesSection | null): SlidesSection {
  const base = section ?? createSlidesSection()
  const { root, rootId } = resolveRoot(mind, base)
  const defaults = defaultPageIds(root)
  const defaultSet = new Set(defaults)

  const merged = base.pages.filter((p) => defaultSet.has(p.nodeId))
  const present = new Set(merged.map((p) => p.nodeId))

  defaults.forEach((id, i) => {
    if (present.has(id)) return
    let insertAt = 0
    for (let j = i - 1; j >= 0; j--) {
      const anchor = merged.findIndex((p) => p.nodeId === defaults[j])
      if (anchor >= 0) {
        insertAt = anchor + 1
        break
      }
    }
    merged.splice(insertAt, 0, { nodeId: id, notes: '', hidden: false })
    present.add(id)
  })

  return { config: normalizeConfig(base.config), rootId, pages: merged }
}

/** 由导图 + 编排段计算渲染模型（内容派生自节点，覆写优先） */
export function buildSlideDoc(mind: MindData, section: SlidesSection): SlideDoc {
  const { root } = resolveRoot(mind, section)
  const index = indexBranch(root)

  const pages: SlidePage[] = []
  for (const meta of section.pages) {
    const entry = index.get(meta.nodeId)
    if (!entry) continue
    const layout = meta.layout ?? defaultLayout(entry.node, entry.depth)
    pages.push({
      nodeId: entry.node.id,
      layout,
      title: entry.node.topic,
      bullets: layout === 'content' ? (entry.node.children ?? []).map((c) => c.topic) : [],
      image: entry.node.image,
      notes: meta.notes,
      hidden: meta.hidden,
    })
  }
  return { config: section.config, pages }
}

/** 一键生成：默认规则转换整图（等价于空编排段的同步 + 渲染） */
export function mindToSlides(mind: MindData): SlideDoc {
  return buildSlideDoc(mind, syncSlides(mind, null))
}

export type { SlidePageMeta, SlidesSection }
