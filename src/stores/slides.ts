import { defineStore } from 'pinia'
import { buildSlideDoc, syncSlides } from '@/core/slides'
import type { SlideAppearance, SlideDoc, SlideLayout, SlidesSection } from '@/core/types'
import { mindMap } from '@/mindmap/adapter'
import { useSettingsStore } from './settings'

const MAX_HISTORY = 50

export const useSlidesStore = defineStore('slides', {
  state: () => ({
    /** 编排段（持久化到 .smind 的部分） */
    section: null as SlidesSection | null,
    /** 渲染模型（由导图 + section 计算） */
    doc: null as SlideDoc | null,
    /** 当前选中的幻灯片页（nodeId） */
    activePageId: null as string | null,
    /** 导图画布当前选中的节点 */
    selectedNodeIds: [] as string[],
    /** 编排操作历史（section 快照，仅用户编排操作入栈） */
    history: [] as SlidesSection[],
  }),

  getters: {
    pages: (state) => state.doc?.pages ?? [],
    activePage: (state) => state.doc?.pages.find((p) => p.nodeId === state.activePageId) ?? null,
    activeMeta: (state) =>
      state.section?.pages.find((p) => p.nodeId === state.activePageId) ?? null,
    visibleCount: (state) => state.doc?.pages.filter((p) => !p.hidden).length ?? 0,
    appearance: (state): SlideAppearance => state.section?.config.appearance ?? 'dark',
    canUndo: (state) => state.history.length > 0,
  },

  actions: {
    /** 打开/新建文档时载入编排段并全量重算；新文档应用默认外观设置 */
    loadSection(section: SlidesSection | null) {
      const isNew = section === null
      this.section = section
      this.activePageId = null
      this.history = []
      this.refresh()
      if (isNew && this.section) {
        ;(this.section as SlidesSection).config.appearance = useSettingsStore().defaultAppearance
        this.rebuild()
      }
    },

    /** 与画布当前数据增量同步并重建渲染模型 */
    refresh() {
      try {
        const mind = mindMap.getData()
        this.section = syncSlides(mind, this.section)
        this.doc = buildSlideDoc(mind, this.section)
      } catch {
        // 画布尚未初始化时忽略
      }
    },

    /** 仅重建渲染模型（编排段自身变化，导图未动） */
    rebuild() {
      if (!this.section) return
      try {
        this.doc = buildSlideDoc(mindMap.getData(), this.section)
      } catch {
        // 画布尚未初始化时忽略
      }
    },

    /** 编排操作前记录快照（供撤销；JSON 拷贝避开 reactive Proxy） */
    pushHistory() {
      if (!this.section) return
      this.history.push(JSON.parse(JSON.stringify(this.section)) as SlidesSection)
      if (this.history.length > MAX_HISTORY) this.history.shift()
    },

    /** 撤销上一次编排操作 */
    undoArrangement() {
      const prev = this.history.pop()
      if (!prev) return
      this.section = prev
      this.refresh()
      this.markDocDirty()
    },

    /** 从选中分支生成（rootId 切换到该节点） */
    generateFromBranch(nodeId: string) {
      if (!this.section) this.refresh()
      if (!this.section) return
      this.pushHistory()
      this.section = { ...this.section, rootId: nodeId }
      this.refresh()
      this.markDocDirty()
    },

    /** 恢复整图生成 */
    resetToFullMap() {
      if (!this.section) return
      this.pushHistory()
      this.section = { ...this.section, rootId: undefined }
      this.refresh()
      this.markDocDirty()
    },

    /** 重新生成：丢弃顺序与覆写 */
    regenerate() {
      this.pushHistory()
      this.section = null
      this.activePageId = null
      this.refresh()
      this.markDocDirty()
    },

    movePage(from: number, to: number) {
      if (!this.section || from === to) return
      this.pushHistory()
      const pages = [...this.section.pages]
      const [moved] = pages.splice(from, 1)
      pages.splice(to, 0, moved)
      this.section = { ...this.section, pages }
      this.rebuild()
      this.markDocDirty()
    },

    setHidden(nodeId: string, hidden: boolean) {
      const meta = this.section?.pages.find((p) => p.nodeId === nodeId)
      if (!meta) return
      this.pushHistory()
      meta.hidden = hidden
      this.rebuild()
      this.markDocDirty()
    },

    /** layout 传 undefined 表示恢复默认规则 */
    setLayout(nodeId: string, layout: SlideLayout | undefined) {
      const meta = this.section?.pages.find((p) => p.nodeId === nodeId)
      if (!meta) return
      this.pushHistory()
      meta.layout = layout
      this.rebuild()
      this.markDocDirty()
    },

    setNotes(nodeId: string, notes: string) {
      const meta = this.section?.pages.find((p) => p.nodeId === nodeId)
      if (!meta) return
      meta.notes = notes
      this.rebuild()
      this.markDocDirty()
    },

    /** 切换演示明暗外观 */
    setAppearance(appearance: SlideAppearance) {
      if (!this.section) this.refresh()
      if (!this.section || this.section.config.appearance === appearance) return
      this.pushHistory()
      this.section = { ...this.section, config: { ...this.section.config, appearance } }
      this.rebuild()
      this.markDocDirty()
    },

    setSelectedNodes(ids: string[]) {
      this.selectedNodeIds = ids
    },

    /** 编排变化也属于文档修改：走 documentStore 的脏标记/自动保存 */
    async markDocDirty() {
      const { useDocumentStore } = await import('./document')
      useDocumentStore().markDirty()
    },
  },
})
