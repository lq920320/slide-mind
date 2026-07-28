import type { MindData, SlidesSection } from './types'

/** .smind v1 文件格式 */
export interface SmindFile {
  version: 1
  meta: {
    title: string
    createdAt: string
    updatedAt: string
  }
  mindmap: MindData
  /** 幻灯片编排段；只存顺序/覆写，内容以导图为唯一数据源 */
  slides: SlidesSection | null
}

/** 创建空白文档 */
export function createEmptyDocument(title = '未命名导图'): SmindFile {
  const now = new Date().toISOString()
  return {
    version: 1,
    meta: { title, createdAt: now, updatedAt: now },
    mindmap: {
      nodeData: { id: 'root', topic: title, children: [] },
    },
    slides: null,
  }
}

/** 序列化为文件内容（更新 updatedAt 与标题） */
export function serializeDocument(doc: SmindFile): string {
  const next: SmindFile = {
    ...doc,
    meta: {
      ...doc.meta,
      title: doc.mindmap.nodeData.topic,
      updatedAt: new Date().toISOString(),
    },
  }
  return JSON.stringify(next, null, 2)
}

/** 解析并校验文件内容，格式非法时抛出带原因的错误 */
export function parseDocument(content: string): SmindFile {
  let raw: unknown
  try {
    raw = JSON.parse(content)
  } catch {
    throw new Error('文件不是合法的 JSON')
  }

  const doc = raw as Partial<SmindFile>
  if (doc.version !== 1) {
    throw new Error(`不支持的文件版本: ${String(doc.version)}`)
  }
  if (!doc.mindmap?.nodeData?.id || typeof doc.mindmap.nodeData.topic !== 'string') {
    throw new Error('文件缺少有效的思维导图数据')
  }

  return {
    version: 1,
    meta: {
      title: doc.meta?.title ?? doc.mindmap.nodeData.topic,
      createdAt: doc.meta?.createdAt ?? new Date().toISOString(),
      updatedAt: doc.meta?.updatedAt ?? new Date().toISOString(),
    },
    mindmap: doc.mindmap as MindData,
    slides: doc.slides ?? null,
  }
}
