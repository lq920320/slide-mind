import MindElixir, { DARK_THEME, THEME } from 'mind-elixir'
import type { MindElixirData, MindElixirInstance, Theme } from 'mind-elixir'
import { en as menuEn, zh_CN as menuZh } from 'mind-elixir/i18n'
import 'mind-elixir/style.css'
import type { MindData } from '@/core/types'

/** 内置主题（name 为稳定 key，UI 展示时经 i18n 翻译） */
export const MIND_THEMES: Theme[] = [
  { ...THEME, name: 'default' },
  { ...DARK_THEME, name: 'dark' },
  {
    ...THEME,
    name: 'warm',
    palette: ['#e67e22', '#d35400', '#f39c12', '#c0392b', '#e74c3c', '#f1c40f'],
  },
  {
    ...THEME,
    name: 'forest',
    palette: ['#16a085', '#27ae60', '#2e8b57', '#1abc9c', '#2ecc71', '#3d9970'],
  },
]

export type ChangeListener = () => void
export type SelectListener = (nodeIds: string[]) => void

/** 初始化选项：右键菜单语言与扩展项 */
export interface MindMapInitOptions {
  locale?: 'zh' | 'en'
  contextMenuExtensions?: Array<{ name: string; handler: (nodeId: string) => void }>
}

/** 深拷贝（MindData 为纯 JSON；structuredClone 无法处理 Vue reactive Proxy） */
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * mind-elixir 适配层：业务代码只依赖本类，不直接触碰第三方 API，
 * 便于未来升级或替换导图引擎（见 doc/01 §6 风险项）。
 */
export class MindMapAdapter {
  private mind: MindElixirInstance | null = null
  private changeListeners = new Set<ChangeListener>()
  private selectListeners = new Set<SelectListener>()
  private lastThemeName: string | null = null

  /** 挂载并渲染导图；重复调用会重建实例（监听器保留） */
  init(el: HTMLElement, data: MindData, options: MindMapInitOptions = {}): void {
    this.mind?.destroy()
    this.mind = new MindElixir({
      el,
      direction: MindElixir.SIDE,
      toolBar: true,
      keypress: true,
      allowUndo: true,
      contextMenu: {
        locale: options.locale === 'en' ? menuEn : menuZh,
        focus: true,
        link: true,
        extend: (options.contextMenuExtensions ?? []).map((ext) => ({
          name: ext.name,
          onclick: () => {
            const nodeId = this.mind?.currentNode?.nodeObj.id
            if (nodeId) ext.handler(nodeId)
          },
        })),
      },
    })
    this.mind.init(deepClone(data) as unknown as MindElixirData)
    if (this.lastThemeName) this.setTheme(this.lastThemeName)

    this.mind.bus.addListener('operation', () => {
      this.changeListeners.forEach((fn) => fn())
    })
    this.mind.bus.addListener('selectNodes', (nodes) => {
      const ids = nodes.map((n) => n.id)
      this.selectListeners.forEach((fn) => fn(ids))
    })
  }

  /** 读取当前导图数据（深拷贝，外部可安全持有） */
  getData(): MindData {
    if (!this.mind) throw new Error('MindMapAdapter 尚未初始化')
    return this.mind.getData() as unknown as MindData
  }

  /** 用新数据整体刷新（打开文件/切换文档时使用） */
  load(data: MindData): void {
    this.mind?.refresh(deepClone(data) as unknown as MindElixirData)
    this.mind?.toCenter()
  }

  /** 切换主题（记忆以便重建实例后恢复） */
  setTheme(name: string): void {
    const theme = MIND_THEMES.find((t) => t.name === name)
    if (!theme) return
    this.lastThemeName = name
    this.mind?.changeTheme(theme)
  }

  /** 画布聚焦并选中指定节点 */
  focusNode(id: string): void {
    if (!this.mind) return
    try {
      const topic = this.mind.findEle(id)
      this.mind.scrollIntoView(topic, true)
      this.mind.selectNode(topic)
    } catch {
      // 节点可能处于折叠分支中而未渲染，忽略
    }
  }

  /** 导图内容变化（任何编辑操作）回调 */
  onChange(fn: ChangeListener): () => void {
    this.changeListeners.add(fn)
    return () => this.changeListeners.delete(fn)
  }

  /** 节点选中回调 */
  onSelect(fn: SelectListener): () => void {
    this.selectListeners.add(fn)
    return () => this.selectListeners.delete(fn)
  }

  destroy(): void {
    this.mind?.destroy()
    this.mind = null
    this.changeListeners.clear()
    this.selectListeners.clear()
  }
}

/** 全应用单例（导图实例是非响应式重对象，不放入 Pinia） */
export const mindMap = new MindMapAdapter()
