<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { isTauri } from '@tauri-apps/api/core'
import { ask } from '@tauri-apps/plugin-dialog'
import type { SlideLayout, SlidePage } from '@/core/types'
import { mindMap } from '@/mindmap/adapter'
import { useSlidesStore } from '@/stores/slides'

const { t } = useI18n()
const slides = useSlidesStore()

const LAYOUT_KEYS: Record<SlideLayout, string> = {
  title: 'slides.layoutTitle',
  section: 'slides.layoutSection',
  content: 'slides.layoutContent',
  image: 'slides.layoutImage',
}

const layoutOptions = computed<Array<{ value: SlideLayout | ''; label: string }>>(() => [
  { value: '', label: t('slides.layoutAuto') },
  { value: 'title', label: t('slides.layoutTitle') },
  { value: 'section', label: t('slides.layoutSection') },
  { value: 'content', label: t('slides.layoutContent') },
  { value: 'image', label: t('slides.layoutImage') },
])

const stripEl = ref<HTMLDivElement>()
const dragIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)

/** 单选画布节点且该节点有子节点时，允许「从选中分支生成」 */
const branchCandidate = computed(() =>
  slides.selectedNodeIds.length === 1 ? slides.selectedNodeIds[0] : null,
)

const activeLayoutValue = computed({
  get: () => slides.activeMeta?.layout ?? '',
  set: (v: SlideLayout | '') => {
    if (slides.activePageId) slides.setLayout(slides.activePageId, v === '' ? undefined : v)
  },
})

const activeNotes = computed({
  get: () => slides.activeMeta?.notes ?? '',
  set: (v: string) => {
    if (slides.activePageId) slides.setNotes(slides.activePageId, v)
  },
})

function selectPage(page: SlidePage) {
  slides.activePageId = page.nodeId
  mindMap.focusNode(page.nodeId)
}

function onDragStart(index: number, e: DragEvent) {
  dragIndex.value = index
  e.dataTransfer?.setData('text/plain', String(index))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(index: number, e: DragEvent) {
  e.preventDefault()
  dropIndex.value = index
}

function onDrop(index: number) {
  if (dragIndex.value !== null) slides.movePage(dragIndex.value, index)
  dragIndex.value = null
  dropIndex.value = null
}

async function regenerate() {
  const message = t('slides.regenerateConfirm')
  const agreed = isTauri()
    ? await ask(message, { title: 'SlideMind', kind: 'warning' })
    : window.confirm(message)
  if (agreed) slides.regenerate()
}

// 画布选中节点 → 高亮并滚动到对应缩略图（双向定位的反向）
let offSelect: (() => void) | undefined

onMounted(() => {
  slides.refresh()
  offSelect = mindMap.onSelect((ids) => {
    slides.setSelectedNodes(ids)
    if (ids.length === 1 && slides.pages.some((p) => p.nodeId === ids[0])) {
      slides.activePageId = ids[0]
    }
  })
})

watch(
  () => slides.activePageId,
  (id) => {
    if (!id) return
    stripEl.value
      ?.querySelector(`[data-node-id="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  },
)

onBeforeUnmount(() => offSelect?.())
</script>

<template>
  <section class="slide-panel">
    <header class="panel-header">
      <strong>{{ t('slides.title') }}</strong>
      <span class="page-count">
        {{ t('slides.pageCount', { visible: slides.visibleCount, total: slides.pages.length }) }}
      </span>
      <span v-if="slides.section?.rootId" class="branch-badge">{{ t('slides.branchBadge') }}</span>
      <span class="spacer" />
      <button
        :disabled="!slides.canUndo"
        :title="t('slides.undoTip')"
        @click="slides.undoArrangement()"
      >
        ↩
      </button>
      <button
        class="appearance-btn"
        :title="
          slides.appearance === 'dark'
            ? t('slides.appearanceToLight')
            : t('slides.appearanceToDark')
        "
        @click="slides.setAppearance(slides.appearance === 'dark' ? 'light' : 'dark')"
      >
        {{ slides.appearance === 'dark' ? '🌙' : '☀️' }}
      </button>
      <button
        :disabled="!branchCandidate"
        :title="t('slides.genFromBranchTip')"
        @click="branchCandidate && slides.generateFromBranch(branchCandidate)"
      >
        {{ t('slides.genFromBranch') }}
      </button>
      <button v-if="slides.section?.rootId" @click="slides.resetToFullMap()">
        {{ t('slides.restoreFull') }}
      </button>
      <button :title="t('slides.regenerateTip')" @click="regenerate">
        {{ t('slides.regenerate') }}
      </button>
    </header>

    <div class="panel-body">
      <div ref="stripEl" class="strip">
        <div
          v-for="(page, i) in slides.pages"
          :key="page.nodeId"
          class="card"
          :class="{
            active: page.nodeId === slides.activePageId,
            hidden: page.hidden,
            'drop-target': dropIndex === i && dragIndex !== null && dragIndex !== i,
          }"
          :data-node-id="page.nodeId"
          draggable="true"
          @click="selectPage(page)"
          @dragstart="onDragStart(i, $event)"
          @dragover="onDragOver(i, $event)"
          @drop="onDrop(i)"
          @dragend="((dragIndex = null), (dropIndex = null))"
        >
          <div class="thumb" :class="[`layout-${page.layout}`, `thumb-${slides.appearance}`]">
            <template v-if="page.layout === 'title'">
              <p class="t-title">{{ page.title }}</p>
            </template>
            <template v-else-if="page.layout === 'section'">
              <p class="t-section">{{ page.title }}</p>
            </template>
            <template v-else-if="page.layout === 'image'">
              <p class="t-heading">{{ page.title }}</p>
              <img v-if="page.image" class="t-image" :src="page.image.url" alt="" />
              <span v-else class="t-image-placeholder">🖼</span>
            </template>
            <template v-else>
              <p class="t-heading">{{ page.title }}</p>
              <ul class="t-bullets">
                <li v-for="(b, j) in page.bullets.slice(0, 4)" :key="j">{{ b }}</li>
                <li v-if="page.bullets.length > 4">…</li>
              </ul>
            </template>
          </div>
          <div class="card-meta">
            <span class="index">{{ i + 1 }}</span>
            <span class="layout-badge">{{ t(LAYOUT_KEYS[page.layout]) }}</span>
            <button
              class="eye"
              :title="page.hidden ? t('slides.show') : t('slides.hide')"
              @click.stop="slides.setHidden(page.nodeId, !page.hidden)"
            >
              {{ page.hidden ? '🚫' : '👁' }}
            </button>
          </div>
        </div>
        <p v-if="!slides.pages.length" class="empty-tip">{{ t('slides.emptyTip') }}</p>
      </div>

      <aside v-if="slides.activePage" class="page-editor">
        <label>
          {{ t('slides.layout') }}
          <select v-model="activeLayoutValue">
            <option v-for="opt in layoutOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </label>
        <label class="notes-label">
          {{ t('slides.notes') }}
          <textarea v-model="activeNotes" rows="3" :placeholder="t('slides.notesPlaceholder')" />
        </label>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.slide-panel {
  border-top: 1px solid #3a3d43;
  background: #232428;
  color: #d5d8dd;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  font-size: 13px;
}

.page-count {
  color: #9aa0a8;
}

.branch-badge {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  background: #5865f2;
  color: #fff;
}

.spacer {
  flex: 1;
}

.appearance-btn {
  font-size: 13px;
}

.panel-header button {
  font-size: 12px;
  padding: 3px 10px;
  border: 1px solid #4a4d55;
  border-radius: 5px;
  background: #383b41;
  color: #e6e6e6;
  cursor: pointer;
}

.panel-header button:hover:not(:disabled) {
  background: #45484f;
}

.panel-header button:disabled {
  opacity: 0.5;
  cursor: default;
}

.panel-body {
  display: flex;
  min-height: 0;
}

.strip {
  flex: 1;
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 4px 12px 10px;
}

.card {
  flex-shrink: 0;
  width: 168px;
  cursor: pointer;
  border-radius: 6px;
  padding: 3px;
  border: 2px solid transparent;
}

.card.active {
  border-color: #5865f2;
}

.card.hidden .thumb {
  opacity: 0.35;
}

.card.drop-target {
  border-color: #22a06b;
}

.thumb {
  aspect-ratio: 16 / 9;
  background: #fff;
  color: #1f2328;
  border-radius: 4px;
  overflow: hidden;
  padding: 8px;
  display: flex;
  flex-direction: column;
}

/* 缩略图跟随演示明暗外观 */
.thumb-dark {
  background: #191a1e;
  color: #e8eaf0;
}

.thumb-dark .t-title,
.thumb-dark .t-heading {
  color: #fff;
}

.thumb-dark .t-section {
  color: #c8cdd6;
}

.thumb.layout-title,
.thumb.layout-section {
  align-items: center;
  justify-content: center;
  text-align: center;
}

.t-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.t-section {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #3b4252;
}

.t-heading {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.t-bullets {
  margin: 0;
  padding-left: 14px;
  font-size: 8px;
  line-height: 1.5;
  overflow: hidden;
}

.t-image {
  flex: 1;
  min-height: 0;
  object-fit: contain;
}

.t-image-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 2px 0;
  font-size: 11px;
  color: #9aa0a8;
}

.layout-badge {
  border: 1px solid #4a4d55;
  border-radius: 3px;
  padding: 0 4px;
  font-size: 10px;
}

.eye {
  margin-left: auto;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: inherit;
}

.empty-tip {
  margin: auto;
  font-size: 13px;
  color: #9aa0a8;
}

.page-editor {
  width: 240px;
  flex-shrink: 0;
  border-left: 1px solid #3a3d43;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
}

.page-editor label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-editor select,
.page-editor textarea {
  font-size: 12px;
  border: 1px solid #4a4d55;
  border-radius: 4px;
  background: #383b41;
  color: #e6e6e6;
  padding: 4px 6px;
}

.page-editor textarea {
  resize: none;
  font-family: inherit;
}
</style>
