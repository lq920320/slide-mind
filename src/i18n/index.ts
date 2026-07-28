import { createI18n } from 'vue-i18n'
import { CoreError } from '@/core/errors'

const zh = {
  app: { name: 'SlideMind' },
  toolbar: {
    new: '新建',
    open: '打开',
    recent: '最近 ▾',
    save: '保存',
    saving: '保存中…',
    saveAs: '另存为',
    import: '导入 ▾',
    importTip: '导入 XMind / Markdown 大纲',
    importXmind: 'XMind (.xmind)',
    importMarkdown: 'Markdown 大纲 (.md)',
    export: '导出 ▾',
    exportSlidev: 'Slidev Markdown (.md)',
    exportPdf: '幻灯片 PDF',
    exportPng: '幻灯片 PNG（逐页）',
    exportOutline: 'Markdown 大纲 (.md)',
    exportXmind: 'XMind (.xmind)',
    present: '▶ 演示',
    presentTip: '从头开始演示 (F5)',
    mapTheme: '导图主题',
    searchPlaceholder: '搜索节点 (⌘F)',
    outline: '大纲',
    slidesPanel: '幻灯片',
    slidesPanelTip: '幻灯片编排面板',
    language: '语言',
  },
  mindTheme: { default: '默认', dark: '暗色', warm: '暖阳', forest: '森林' },
  banner: { clickToClose: '（点击关闭）' },
  status: {
    exportedSlidev: '已导出 Slidev Markdown：{path}',
    exportedPdf: '已导出 PDF：{path}',
    exportedPng: '已导出 {count} 张 PNG',
    exportedOutline: '已导出 Markdown 大纲：{path}',
    exportedXmind: '已导出 XMind：{path}',
  },
  doc: {
    untitled: '未命名导图',
    unsaved: '未保存',
    closeConfirm: '当前文档有未保存的修改，确定要关闭吗？',
    restoreBackupConfirm: '文件无法打开（{reason}），但找到了上一次保存前的备份。是否从备份恢复？',
  },
  dialog: {
    smindFilter: 'SlideMind 文档',
    xmindFilter: 'XMind 文件',
    slidevFilter: 'Slidev Markdown',
    pngDirTitle: '选择 PNG 导出目录',
  },
  slides: {
    title: '幻灯片',
    pageCount: '{visible}/{total} 页',
    branchBadge: '分支演示',
    genFromBranch: '从选中分支生成',
    genFromBranchMenu: '由此分支生成幻灯片',
    genFromBranchTip: '以画布选中节点为根生成幻灯片',
    restoreFull: '恢复整图',
    regenerate: '重新生成',
    regenerateTip: '丢弃编排调整，按默认规则重建',
    regenerateConfirm: '重新生成将丢弃当前的页序、布局与备注调整，确定继续？',
    undoTip: '撤销上一次编排操作',
    emptyTip: '导图为空，添加节点后自动生成幻灯片',
    layout: '布局',
    layoutAuto: '自动',
    layoutTitle: '封面',
    layoutSection: '章节',
    layoutContent: '内容',
    layoutImage: '图片',
    notes: '演讲备注',
    notesPlaceholder: '仅演讲者可见…',
    hide: '在演示中隐藏',
    show: '在演示中显示',
    appearanceToLight: '切换为浅色演示',
    appearanceToDark: '切换为深色演示',
  },
  present: {
    empty: '没有可放映的幻灯片',
    allHidden: '所有页面都被隐藏了',
    hint: '← → 翻页 · N 演讲者视图 · Esc 退出',
    exitTip: '退出演示 (Esc)',
    notes: '备注',
    noNotes: '（本页无备注）',
    next: '下一页',
    lastPage: '（已是最后一页）',
  },
  update: {
    available: '发现新版本 {version}，是否立即下载并重启更新？',
    installing: '正在下载更新…',
  },
  settings: {
    title: '设置',
    open: '设置',
    close: '关闭',
    autosaveInterval: '自动保存间隔',
    seconds: '秒',
    defaultAppearance: '新文档默认外观',
    dark: '深色',
    light: '浅色',
  },
  coreError: {
    invalidJson: '文件不是合法的 JSON',
    unsupportedVersion: '不支持的文件版本：{version}',
    missingMindmap: '文件缺少有效的思维导图数据',
    xmindInvalidJson: 'XMind 内容不是合法的 JSON',
    xmindMissingRoot: 'XMind 文件缺少根主题（仅支持 XMind 2020+ 格式）',
    markdownNoHeading: 'Markdown 中没有找到任何标题（# 开头）',
  },
}

/** en 与 zh 结构必须一致 */
const en: typeof zh = {
  app: { name: 'SlideMind' },
  toolbar: {
    new: 'New',
    open: 'Open',
    recent: 'Recent ▾',
    save: 'Save',
    saving: 'Saving…',
    saveAs: 'Save As',
    import: 'Import ▾',
    importTip: 'Import XMind / Markdown outline',
    importXmind: 'XMind (.xmind)',
    importMarkdown: 'Markdown outline (.md)',
    export: 'Export ▾',
    exportSlidev: 'Slidev Markdown (.md)',
    exportPdf: 'Slides PDF',
    exportPng: 'Slides PNG (per page)',
    exportOutline: 'Markdown outline (.md)',
    exportXmind: 'XMind (.xmind)',
    present: '▶ Present',
    presentTip: 'Present from beginning (F5)',
    mapTheme: 'Map theme',
    searchPlaceholder: 'Search nodes (⌘F)',
    outline: 'Outline',
    slidesPanel: 'Slides',
    slidesPanelTip: 'Slide arrangement panel',
    language: 'Language',
  },
  mindTheme: { default: 'Default', dark: 'Dark', warm: 'Warm', forest: 'Forest' },
  banner: { clickToClose: ' (click to dismiss)' },
  status: {
    exportedSlidev: 'Exported Slidev Markdown: {path}',
    exportedPdf: 'Exported PDF: {path}',
    exportedPng: 'Exported {count} PNG files',
    exportedOutline: 'Exported Markdown outline: {path}',
    exportedXmind: 'Exported XMind: {path}',
  },
  doc: {
    untitled: 'Untitled Map',
    unsaved: 'Unsaved',
    closeConfirm: 'You have unsaved changes. Close anyway?',
    restoreBackupConfirm:
      'The file could not be opened ({reason}), but a backup from the previous save was found. Restore from backup?',
  },
  dialog: {
    smindFilter: 'SlideMind Document',
    xmindFilter: 'XMind File',
    slidevFilter: 'Slidev Markdown',
    pngDirTitle: 'Choose PNG export folder',
  },
  slides: {
    title: 'Slides',
    pageCount: '{visible}/{total} pages',
    branchBadge: 'Branch mode',
    genFromBranch: 'Generate from branch',
    genFromBranchMenu: 'Generate slides from this branch',
    genFromBranchTip: 'Generate slides from the selected node',
    restoreFull: 'Full map',
    regenerate: 'Regenerate',
    regenerateTip: 'Discard arrangement and rebuild with default rules',
    regenerateConfirm: 'Regenerating discards page order, layout and notes changes. Continue?',
    undoTip: 'Undo last arrangement change',
    emptyTip: 'Map is empty. Slides appear as you add nodes.',
    layout: 'Layout',
    layoutAuto: 'Auto',
    layoutTitle: 'Cover',
    layoutSection: 'Section',
    layoutContent: 'Content',
    layoutImage: 'Image',
    notes: 'Speaker notes',
    notesPlaceholder: 'Visible to the presenter only…',
    hide: 'Hide in show',
    show: 'Show in show',
    appearanceToLight: 'Switch to light slides',
    appearanceToDark: 'Switch to dark slides',
  },
  present: {
    empty: 'Nothing to present',
    allHidden: 'All pages are hidden',
    hint: '← → navigate · N presenter view · Esc exit',
    exitTip: 'Exit (Esc)',
    notes: 'Notes',
    noNotes: '(no notes for this page)',
    next: 'Next',
    lastPage: '(last page)',
  },
  update: {
    available: 'Version {version} is available. Download and restart now?',
    installing: 'Downloading update…',
  },
  settings: {
    title: 'Settings',
    open: 'Settings',
    close: 'Close',
    autosaveInterval: 'Autosave interval',
    seconds: 's',
    defaultAppearance: 'Default appearance',
    dark: 'Dark',
    light: 'Light',
  },
  coreError: {
    invalidJson: 'The file is not valid JSON',
    unsupportedVersion: 'Unsupported file version: {version}',
    missingMindmap: 'The file has no valid mind map data',
    xmindInvalidJson: 'XMind content is not valid JSON',
    xmindMissingRoot: 'XMind file has no root topic (only XMind 2020+ is supported)',
    markdownNoHeading: 'No heading (#) found in the Markdown',
  },
}

const STORAGE_KEY = 'slide-mind-locale'

export type AppLocale = 'zh' | 'en'

function initialLocale(): AppLocale {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'zh' || saved === 'en') return saved
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'zh',
  messages: { zh, en },
})

export function setLocale(locale: AppLocale) {
  i18n.global.locale.value = locale
  localStorage.setItem(STORAGE_KEY, locale)
}

/** 组件外（store/service）使用 */
export const t = i18n.global.t

/** 统一错误文案：core 错误码翻译，其余原样展示 */
export function formatError(e: unknown): string {
  if (e instanceof CoreError) return t(`coreError.${e.code}`, e.params ?? {})
  return String(e)
}
