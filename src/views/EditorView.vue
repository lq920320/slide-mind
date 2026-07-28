<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { ask } from '@tauri-apps/plugin-dialog'
import MindCanvas from '@/components/MindCanvas.vue'
import OutlineNode from '@/components/OutlineNode.vue'
import PresentationView from '@/components/PresentationView.vue'
import SettingsDialog from '@/components/SettingsDialog.vue'
import SlidePanel from '@/components/SlidePanel.vue'
import { searchNodes } from '@/core/search'
import { formatError } from '@/i18n'
import { MIND_THEMES, mindMap } from '@/mindmap/adapter'
import { useDocumentStore } from '@/stores/document'
import { useSlidesStore } from '@/stores/slides'

const { t } = useI18n()
const store = useDocumentStore()
const slides = useSlidesStore()

const showOutline = ref(true)
const showSlides = ref(true)
const presenting = ref(false)
/** 当前展开的工具栏下拉菜单（互斥，点击外部关闭） */
const openMenu = ref<'recent' | 'import' | 'export' | null>(null)
const searchActive = ref(false)
const showSettings = ref(false)
const exportStatus = ref('')
const themeName = ref(MIND_THEMES[0].name)
const keyword = ref('')
const searchInput = ref<HTMLInputElement>()
const outlinePanel = ref<HTMLElement>()

// 画布选中节点 → 大纲高亮并滚动到可见（反向联动）
const outlineActiveId = computed(() =>
  slides.selectedNodeIds.length === 1 ? slides.selectedNodeIds[0] : null,
)

watch(outlineActiveId, (id) => {
  if (!id) return
  outlinePanel.value
    ?.querySelector(`[data-node-id="${CSS.escape(id)}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
})

const searchResults = computed(() =>
  store.outlineTree ? searchNodes(store.outlineTree, keyword.value) : [],
)

function locateNode(id: string) {
  mindMap.focusNode(id)
}

function toggleMenu(name: 'recent' | 'import' | 'export') {
  openMenu.value = openMenu.value === name ? null : name
}

// 点击菜单外部时收起下拉与搜索结果
function handleGlobalPointerDown(e: PointerEvent) {
  const target = e.target as HTMLElement | null
  if (!target?.closest('.menu-wrap')) openMenu.value = null
  if (!target?.closest('.search-wrap')) searchActive.value = false
}

function pickSearchResult(id: string) {
  locateNode(id)
  keyword.value = ''
  searchActive.value = false
}

async function openRecent(path: string) {
  openMenu.value = null
  await store.openDocument(path)
}

async function runExport(kind: 'slidev' | 'pdf' | 'png' | 'outline' | 'xmind') {
  openMenu.value = null
  try {
    // 按需加载导出模块（jspdf/snapdom 体积较大，不进主包）
    const svc = await import('@/export/exportService')
    if (kind === 'slidev') {
      const path = await svc.exportSlidevMarkdown()
      if (path) flashStatus(t('status.exportedSlidev', { path }))
    } else if (kind === 'pdf') {
      const path = await svc.exportSlidesPdf()
      if (path) flashStatus(t('status.exportedPdf', { path }))
    } else if (kind === 'png') {
      const count = await svc.exportSlidesPng()
      if (count) flashStatus(t('status.exportedPng', { count }))
    } else if (kind === 'xmind') {
      const path = await svc.exportXmind()
      if (path) flashStatus(t('status.exportedXmind', { path }))
    } else {
      const path = await svc.exportMarkdownOutline()
      if (path) flashStatus(t('status.exportedOutline', { path }))
    }
  } catch (e) {
    store.error = formatError(e)
  }
}

function flashStatus(text: string) {
  exportStatus.value = text
  setTimeout(() => (exportStatus.value = ''), 4000)
}

watch(themeName, (name) => mindMap.setTheme(name))

// 窗口标题跟随文档标题与脏标记（纯浏览器调试环境无 Tauri API，跳过）
watch(
  () => store.displayTitle,
  (title) => {
    if (isTauri()) void getCurrentWindow().setTitle(`${title} - SlideMind`)
  },
  { immediate: true },
)

async function setFullscreen(on: boolean) {
  if (isTauri()) {
    await getCurrentWindow().setFullscreen(on)
  } else if (on) {
    await document.documentElement.requestFullscreen().catch(() => {})
  } else if (document.fullscreenElement) {
    await document.exitFullscreen().catch(() => {})
  }
}

function startPresentation() {
  slides.refresh()
  if (!slides.visibleCount) return
  presenting.value = true
  void setFullscreen(true)
}

function exitPresentation() {
  presenting.value = false
  void setFullscreen(false)
}

// 快捷键：Cmd/Ctrl+S 保存、Shift+Cmd/Ctrl+S 另存、Cmd/Ctrl+O 打开、Cmd/Ctrl+F 搜索、F5 演示
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'F5') {
    e.preventDefault()
    if (!presenting.value) startPresentation()
    return
  }
  const mod = e.metaKey || e.ctrlKey
  if (!mod) return
  const key = e.key.toLowerCase()
  if (key === 's') {
    e.preventDefault()
    void (e.shiftKey ? store.saveDocumentAs() : store.saveDocument())
  } else if (key === 'o') {
    e.preventDefault()
    void store.openDocument()
  } else if (key === 'f') {
    e.preventDefault()
    searchInput.value?.focus()
  }
}

// 启动时静默检查更新（仅桌面环境；网络/配置异常静默忽略）
async function checkUpdateSilently() {
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()
    if (!update) return
    const yes = await ask(t('update.available', { version: update.version }), {
      title: 'SlideMind',
    })
    if (!yes) return
    flashStatus(t('update.installing'))
    await update.downloadAndInstall()
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  } catch {
    // 无网络、未发布版本等情况下保持静默
  }
}

// 有未保存修改时，关闭窗口前确认
let unlistenClose: (() => void) | undefined

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('pointerdown', handleGlobalPointerDown)
  await store.loadRecentFiles()
  if (!isTauri()) return
  void checkUpdateSilently()
  unlistenClose = await getCurrentWindow().onCloseRequested(async (event) => {
    if (!store.dirty) return
    const leave = await ask(t('doc.closeConfirm'), {
      title: 'SlideMind',
      kind: 'warning',
    })
    if (!leave) event.preventDefault()
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('pointerdown', handleGlobalPointerDown)
  unlistenClose?.()
})
</script>

<template>
  <div class="editor">
    <header class="toolbar">
      <div class="toolbar-group">
        <button @click="store.newDocument()">{{ t('toolbar.new') }}</button>
        <button @click="store.openDocument()">{{ t('toolbar.open') }}</button>
        <div class="menu-wrap">
          <button :disabled="!store.recentFiles.length" @click="toggleMenu('recent')">
            {{ t('toolbar.recent') }}
          </button>
          <ul v-if="openMenu === 'recent' && store.recentFiles.length" class="dropdown">
            <li v-for="path in store.recentFiles" :key="path">
              <button :title="path" @click="openRecent(path)">
                {{ path.split('/').pop() }}
              </button>
            </li>
          </ul>
        </div>
        <button :disabled="store.saving" @click="store.saveDocument()">
          {{ store.saving ? t('toolbar.saving') : t('toolbar.save') }}
        </button>
        <button @click="store.saveDocumentAs()">{{ t('toolbar.saveAs') }}</button>
        <div class="menu-wrap">
          <button :title="t('toolbar.importTip')" @click="toggleMenu('import')">
            {{ t('toolbar.import') }}
          </button>
          <ul v-if="openMenu === 'import'" class="dropdown">
            <li>
              <button @click="((openMenu = null), store.importXmind())">
                {{ t('toolbar.importXmind') }}
              </button>
            </li>
            <li>
              <button @click="((openMenu = null), store.importMarkdown())">
                {{ t('toolbar.importMarkdown') }}
              </button>
            </li>
          </ul>
        </div>
        <div class="menu-wrap">
          <button @click="toggleMenu('export')">{{ t('toolbar.export') }}</button>
          <ul v-if="openMenu === 'export'" class="dropdown">
            <li>
              <button @click="runExport('slidev')">{{ t('toolbar.exportSlidev') }}</button>
            </li>
            <li>
              <button @click="runExport('pdf')">{{ t('toolbar.exportPdf') }}</button>
            </li>
            <li>
              <button @click="runExport('png')">{{ t('toolbar.exportPng') }}</button>
            </li>
            <li>
              <button @click="runExport('xmind')">{{ t('toolbar.exportXmind') }}</button>
            </li>
            <li>
              <button @click="runExport('outline')">{{ t('toolbar.exportOutline') }}</button>
            </li>
          </ul>
        </div>
      </div>

      <div class="toolbar-title" :title="store.filePath ?? t('doc.unsaved')">
        {{ store.displayTitle }}
      </div>

      <div class="toolbar-group">
        <button
          class="present-btn"
          :title="t('toolbar.presentTip')"
          :disabled="!slides.visibleCount"
          @click="startPresentation"
        >
          {{ t('toolbar.present') }}
        </button>
        <select v-model="themeName" :title="t('toolbar.mapTheme')">
          <option v-for="th in MIND_THEMES" :key="th.name" :value="th.name">
            {{ t(`mindTheme.${th.name}`) }}
          </option>
        </select>
        <button :title="t('settings.open')" @click="showSettings = true">⚙</button>
        <div class="search-wrap">
          <input
            ref="searchInput"
            v-model="keyword"
            type="search"
            :placeholder="t('toolbar.searchPlaceholder')"
            @focus="searchActive = true"
          />
          <ul
            v-if="searchActive && keyword && searchResults.length"
            class="dropdown search-results"
          >
            <li v-for="m in searchResults" :key="m.id">
              <button @click="pickSearchResult(m.id)">
                <span class="result-topic">{{ m.topic }}</span>
                <span v-if="m.path.length" class="result-path">{{ m.path.join(' / ') }}</span>
              </button>
            </li>
          </ul>
        </div>
        <button
          :class="{ active: showOutline }"
          :title="t('toolbar.outline')"
          @click="showOutline = !showOutline"
        >
          {{ t('toolbar.outline') }}
        </button>
        <button
          :class="{ active: showSlides }"
          :title="t('toolbar.slidesPanelTip')"
          @click="showSlides = !showSlides"
        >
          {{ t('toolbar.slidesPanel') }}
        </button>
      </div>
    </header>

    <p v-if="store.error" class="error-banner" @click="store.error = null">
      {{ store.error }}{{ t('banner.clickToClose') }}
    </p>
    <p v-if="exportStatus" class="status-banner">{{ exportStatus }}</p>

    <div class="workspace">
      <aside v-if="showOutline" ref="outlinePanel" class="outline-panel">
        <OutlineNode
          v-if="store.outlineTree"
          :node="store.outlineTree"
          :depth="0"
          :active-id="outlineActiveId"
          @locate="locateNode"
        />
      </aside>
      <main class="canvas-area">
        <MindCanvas />
      </main>
    </div>

    <SlidePanel v-show="showSlides" class="slide-panel-slot" />

    <SettingsDialog v-if="showSettings" @close="showSettings = false" />

    <PresentationView v-if="presenting" @exit="exitPresentation" />
  </div>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  background: #2b2d31;
  color: #e6e6e6;
  user-select: none;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-title {
  flex: 1;
  text-align: center;
  font-size: 13px;
  color: #b8bcc4;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.toolbar button,
.toolbar select {
  font-size: 13px;
  padding: 4px 10px;
  border: 1px solid #4a4d55;
  border-radius: 5px;
  background: #383b41;
  color: #e6e6e6;
  cursor: pointer;
}

.toolbar button:hover:not(:disabled) {
  background: #45484f;
}

.toolbar button:disabled {
  opacity: 0.5;
  cursor: default;
}

.toolbar button.active {
  background: #5865f2;
  border-color: #5865f2;
}

.toolbar .present-btn {
  background: #22a06b;
  border-color: #22a06b;
  color: #fff;
}

.toolbar .present-btn:hover:not(:disabled) {
  background: #1f9160;
}

.toolbar input[type='search'] {
  font-size: 13px;
  padding: 4px 8px;
  border: 1px solid #4a4d55;
  border-radius: 5px;
  background: #383b41;
  color: #e6e6e6;
  width: 180px;
}

.menu-wrap,
.search-wrap {
  position: relative;
}

.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 30;
  min-width: 220px;
  max-height: 320px;
  overflow: auto;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: #2b2d31;
  border: 1px solid #4a4d55;
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}

.search-results {
  right: 0;
  left: auto;
}

.dropdown button {
  display: block;
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-topic {
  display: block;
}

.result-path {
  display: block;
  font-size: 11px;
  color: #9aa0a8;
}

.error-banner {
  margin: 0;
  padding: 6px 12px;
  background: #7a2e2e;
  color: #ffd7d7;
  font-size: 13px;
  cursor: pointer;
}

.status-banner {
  margin: 0;
  padding: 6px 12px;
  background: #1f4d38;
  color: #baf3d8;
  font-size: 13px;
}

.workspace {
  flex: 1;
  display: flex;
  min-height: 0;
}

.outline-panel {
  width: 220px;
  flex-shrink: 0;
  overflow: auto;
  padding: 8px 4px;
  background: #232428;
  color: #d5d8dd;
  border-right: 1px solid #3a3d43;
}

.canvas-area {
  flex: 1;
  min-width: 0;
}

.slide-panel-slot {
  height: 200px;
  flex-shrink: 0;
}
</style>
