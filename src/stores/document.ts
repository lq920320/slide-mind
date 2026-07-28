import { defineStore } from 'pinia'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { ask, open, save } from '@tauri-apps/plugin-dialog'
import { createEmptyDocument, parseDocument, serializeDocument } from '@/core/smind'
import type { SmindFile } from '@/core/smind'
import { markdownToMind } from '@/core/markdownOutline'
import type { MindData, MindNode } from '@/core/types'
import { xmindToMind } from '@/core/xmindImport'
import { formatError, t } from '@/i18n'
import { mindMap } from '@/mindmap/adapter'
import { useSettingsStore } from './settings'
import { useSlidesStore } from './slides'

const smindFilter = () => [{ name: t('dialog.smindFilter'), extensions: ['smind'] }]

export const useDocumentStore = defineStore('document', {
  state: () => ({
    /** 当前文件路径，null 表示尚未保存的新文档 */
    filePath: null as string | null,
    /** 当前文档（mindmap 字段仅在打开/新建时可信，编辑中以画布为准） */
    doc: createEmptyDocument() as SmindFile,
    dirty: false,
    saving: false,
    recentFiles: [] as string[],
    /** 大纲视图数据（画布变化后同步的只读副本） */
    outlineTree: null as MindNode | null,
    error: null as string | null,
  }),

  getters: {
    /** 窗口/标签展示用标题 */
    displayTitle(state): string {
      const name = state.filePath
        ? (state.filePath.split('/').pop() ?? state.filePath)
        : state.doc.meta.title
      return `${state.dirty ? '● ' : ''}${name}`
    },
  },

  actions: {
    /** 新建空白文档并加载到画布 */
    newDocument() {
      this.doc = createEmptyDocument(t('doc.untitled'))
      this.filePath = null
      this.dirty = false
      mindMap.load(this.doc.mindmap)
      this.syncOutline()
      useSlidesStore().loadSection(this.doc.slides)
    },

    /** 打开文件；不传 path 时弹出选择框；主文件损坏时尝试从 .bak 恢复 */
    async openDocument(path?: string) {
      try {
        const target = path ?? (await open({ filters: smindFilter(), multiple: false }))
        if (typeof target !== 'string') return
        const content = await invoke<string>('read_document', { path: target })
        let doc: SmindFile
        try {
          doc = parseDocument(content)
        } catch (parseErr) {
          if (await this.tryRestoreBackup(target, String(parseErr))) return
          throw parseErr
        }
        this.loadParsedDocument(doc, target, false)
        this.recentFiles = await invoke<string[]>('add_recent_file', { path: target })
      } catch (e) {
        this.error = formatError(e)
      }
    },

    /** 主文件无法解析时，询问并从 `<path>.bak` 恢复上一版 */
    async tryRestoreBackup(target: string, reason: string): Promise<boolean> {
      let backupDoc: SmindFile
      try {
        const backup = await invoke<string>('read_document', { path: `${target}.bak` })
        backupDoc = parseDocument(backup)
      } catch {
        return false // 无备份或备份同样损坏
      }

      const message = t('doc.restoreBackupConfirm', { reason })
      const agreed = isTauri()
        ? await ask(message, { title: 'SlideMind', kind: 'warning' })
        : window.confirm(message)
      if (!agreed) return false

      // 恢复为未保存修改，由用户确认后保存覆盖损坏的主文件
      this.loadParsedDocument(backupDoc, target, true)
      this.recentFiles = await invoke<string[]>('add_recent_file', { path: target })
      return true
    },

    /** 将已解析的文档装入画布与各面板 */
    loadParsedDocument(doc: SmindFile, filePath: string | null, dirty: boolean) {
      this.doc = doc
      this.filePath = filePath
      this.dirty = dirty
      this.error = null
      mindMap.load(doc.mindmap)
      this.syncOutline()
      useSlidesStore().loadSection(doc.slides)
    },

    /** 导入 XMind（作为新的未保存文档） */
    async importXmind() {
      try {
        const target = await open({
          filters: [{ name: t('dialog.xmindFilter'), extensions: ['xmind'] }],
          multiple: false,
        })
        if (typeof target !== 'string') return
        const content = await invoke<string>('read_xmind', { path: target })
        this.loadImportedMind(xmindToMind(content))
      } catch (e) {
        this.error = formatError(e)
      }
    },

    /** 导入 Markdown 大纲（作为新的未保存文档） */
    async importMarkdown() {
      try {
        const target = await open({
          filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
          multiple: false,
        })
        if (typeof target !== 'string') return
        const content = await invoke<string>('read_document', { path: target })
        this.loadImportedMind(markdownToMind(content))
      } catch (e) {
        this.error = formatError(e)
      }
    },

    /** 将导入的导图作为新文档装入 */
    loadImportedMind(mind: MindData) {
      this.doc = createEmptyDocument(mind.nodeData.topic)
      this.doc.mindmap = mind
      this.filePath = null
      this.dirty = true
      this.error = null
      mindMap.load(mind)
      this.syncOutline()
      useSlidesStore().loadSection(null)
    },

    /** 保存；新文档转入另存为 */
    async saveDocument(): Promise<boolean> {
      if (!this.filePath) return this.saveDocumentAs()
      return this.writeTo(this.filePath)
    },

    /** 另存为 */
    async saveDocumentAs(): Promise<boolean> {
      const target = await save({
        filters: smindFilter(),
        defaultPath: `${this.doc.mindmap.nodeData.topic}.smind`,
      })
      if (!target) return false
      const ok = await this.writeTo(target)
      if (ok) {
        this.filePath = target
        this.recentFiles = await invoke<string[]>('add_recent_file', { path: target })
      }
      return ok
    },

    async writeTo(path: string): Promise<boolean> {
      this.saving = true
      try {
        this.doc.mindmap = mindMap.getData()
        this.doc.slides = useSlidesStore().section
        await invoke('write_document', { path, content: serializeDocument(this.doc) })
        this.dirty = false
        this.error = null
        return true
      } catch (e) {
        this.error = formatError(e)
        return false
      } finally {
        this.saving = false
      }
    },

    /** 画布编辑回调：立即标脏；大纲/幻灯片同步防抖，避免大图频繁全量拷贝卡顿 */
    handleMindChange() {
      this.markDirty()
      clearTimeout(syncTimer)
      syncTimer = setTimeout(() => {
        this.syncOutline()
        useSlidesStore().refresh()
      }, SYNC_DEBOUNCE)
    },

    /** 任何文档级修改（导图编辑/幻灯片编排）都走这里 */
    markDirty() {
      this.dirty = true
      if (this.filePath) this.scheduleAutosave()
    },

    scheduleAutosave() {
      clearTimeout(autosaveTimer)
      autosaveTimer = setTimeout(() => {
        if (this.dirty && this.filePath && !this.saving) void this.saveDocument()
      }, useSettingsStore().autosaveDelayMs)
    },

    syncOutline() {
      try {
        this.outlineTree = mindMap.getData().nodeData
      } catch {
        this.outlineTree = this.doc.mindmap.nodeData
      }
    },

    async loadRecentFiles() {
      try {
        this.recentFiles = await invoke<string[]>('get_recent_files')
      } catch {
        this.recentFiles = []
      }
    },
  },
})

let autosaveTimer: ReturnType<typeof setTimeout> | undefined
let syncTimer: ReturnType<typeof setTimeout> | undefined

const SYNC_DEBOUNCE = 300
