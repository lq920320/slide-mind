/**
 * 领域核心类型定义。
 * 注意：本目录（src/core）保持零依赖纯 TS，禁止 import Vue/Tauri/mind-elixir。
 */

/** 思维导图节点（与 mind-elixir 数据结构对齐的最小子集） */
export interface MindNode {
  id: string
  topic: string
  children?: MindNode[]
  hyperLink?: string
  image?: { url: string; width: number; height: number }
}

/** 思维导图数据根 */
export interface MindData {
  nodeData: MindNode
}

/** 幻灯片布局类型 */
export type SlideLayout = 'title' | 'section' | 'content' | 'image'

/** 演示外观：暗色 / 亮色 */
export type SlideAppearance = 'dark' | 'light'

/** 幻灯片全局配置（随 .smind 持久化，渲染与导出共用） */
export interface SlidesConfig {
  theme: string
  aspectRatio: string
  /** 演示明暗外观；旧文件缺省时视为 dark */
  appearance: SlideAppearance
}

/** 单页幻灯片（渲染模型）：内容通过 nodeId 关联导图节点，导图是唯一数据源 */
export interface SlidePage {
  /** 关联的导图节点 id */
  nodeId: string
  layout: SlideLayout
  /** 页标题（由节点 topic 派生） */
  title: string
  /** 内容要点（由子节点 topic 派生） */
  bullets: string[]
  /** 图片页素材（由节点 image 派生） */
  image?: { url: string; width: number; height: number }
  /** 演讲者备注 */
  notes: string
  /** 是否在演示中跳过 */
  hidden: boolean
}

/** 幻灯片文档模型（渲染用，由导图 + 编排信息计算得出） */
export interface SlideDoc {
  config: SlidesConfig
  pages: SlidePage[]
}

/** 单页编排元信息（持久化到 .smind，不存内容） */
export interface SlidePageMeta {
  nodeId: string
  /** 用户覆写的布局；缺省时按默认规则由节点深度推导 */
  layout?: SlideLayout
  notes: string
  hidden: boolean
}

/** 幻灯片编排段（.smind 中持久化的 slides 字段） */
export interface SlidesSection {
  config: SlidesConfig
  /** 分支演示：以该节点为幻灯片根；缺省为导图根节点 */
  rootId?: string
  pages: SlidePageMeta[]
}
