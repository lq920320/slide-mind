<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Reveal from 'reveal.js'
import 'reveal.js/reveal.css'
import { renderInlineMarkdown as md } from '@/core/inlineMarkdown'
import type { SlidePage } from '@/core/types'
import { useSlidesStore } from '@/stores/slides'

const { t } = useI18n()
const emit = defineEmits<{ exit: [] }>()

const slides = useSlidesStore()

/** 放映页序列（跳过隐藏页） */
const pages = computed<SlidePage[]>(() => slides.pages.filter((p) => !p.hidden))

/** 演示明暗外观（文档级配置） */
const appearance = computed(() => slides.appearance)

const deckEl = ref<HTMLDivElement>()
const currentIndex = ref(0)
const showHud = ref(false)
const elapsed = ref(0)

const currentPage = computed(() => pages.value[currentIndex.value] ?? null)
const nextPage = computed(() => pages.value[currentIndex.value + 1] ?? null)

const elapsedText = computed(() => {
  const m = String(Math.floor(elapsed.value / 60)).padStart(2, '0')
  const s = String(elapsed.value % 60).padStart(2, '0')
  return `${m}:${s}`
})

let deck: InstanceType<typeof Reveal> | null = null
let timer: ReturnType<typeof setInterval> | undefined

// Esc 退出、N 切换演讲者 HUD（capture 阶段拦截，避免与 reveal 内置快捷键冲突）
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    emit('exit')
  } else if (e.key.toLowerCase() === 'n') {
    e.preventDefault()
    e.stopPropagation()
    showHud.value = !showHud.value
  }
}

onMounted(async () => {
  if (!deckEl.value) return
  deck = new Reveal(deckEl.value, {
    embedded: false,
    hash: false,
    history: false,
    transition: 'slide',
    slideNumber: 'c/t',
    keyboardCondition: 'focused',
    controls: true,
    progress: true,
    fragments: true,
  })
  await deck.initialize()
  deck.on('slidechanged', (event: Event) => {
    currentIndex.value = (event as Event & { indexh: number }).indexh
  })
  deckEl.value.focus()
  timer = setInterval(() => (elapsed.value += 1), 1000)
  window.addEventListener('keydown', handleKeydown, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown, true)
  clearInterval(timer)
  deck?.destroy()
  deck = null
})
</script>

<template>
  <div class="presentation-overlay" :class="`appearance-${appearance}`">
    <div ref="deckEl" class="reveal" tabindex="-1">
      <div class="slides">
        <section
          v-for="page in pages"
          :key="page.nodeId"
          :data-layout="page.layout"
          :class="`slide-${page.layout}`"
        >
          <template v-if="page.layout === 'title'">
            <h1 v-html="md(page.title)"></h1>
          </template>
          <template v-else-if="page.layout === 'section'">
            <h2 v-html="md(page.title)"></h2>
          </template>
          <template v-else-if="page.layout === 'image'">
            <h3 v-html="md(page.title)"></h3>
            <img v-if="page.image" :src="page.image.url" alt="" class="slide-image" />
          </template>
          <template v-else>
            <h3 v-html="md(page.title)"></h3>
            <ul>
              <li v-for="(b, i) in page.bullets" :key="i" class="fragment" v-html="md(b)"></li>
            </ul>
          </template>
        </section>
        <section v-if="!pages.length">
          <h2>{{ t('present.empty') }}</h2>
          <p>{{ t('present.allHidden') }}</p>
        </section>
      </div>
    </div>

    <!-- 演讲者 HUD（N 键切换）：备注 + 下一页预览 + 计时 -->
    <aside v-if="showHud" class="presenter-hud">
      <div class="hud-row">
        <span class="hud-timer">⏱ {{ elapsedText }}</span>
        <span class="hud-progress">{{ currentIndex + 1 }} / {{ pages.length }}</span>
      </div>
      <div class="hud-notes">
        <strong>{{ t('present.notes') }}</strong>
        <p>{{ currentPage?.notes || t('present.noNotes') }}</p>
      </div>
      <div class="hud-next">
        <strong>{{ t('present.next') }}</strong>
        <p>{{ nextPage ? nextPage.title : t('present.lastPage') }}</p>
      </div>
    </aside>

    <button class="exit-btn" :title="t('present.exitTip')" @click="emit('exit')">✕</button>
    <p class="hint">{{ t('present.hint') }}</p>
  </div>
</template>

<style scoped>
.presentation-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--sm-bg);
  /* 暗色外观（默认） */
  --sm-bg: #191a1e;
  --sm-text: #e8eaf0;
  --sm-heading: #ffffff;
}

.presentation-overlay.appearance-light {
  --sm-bg: #f7f8fa;
  --sm-text: #2c3138;
  --sm-heading: #16181d;
}

.reveal {
  width: 100%;
  height: 100%;
  outline: none;
  /* 自定义主题：跟随明暗外观，主色与应用对齐 */
  --r-background-color: var(--sm-bg);
  --r-main-color: var(--sm-text);
  --r-heading-color: var(--sm-heading);
  --r-main-font:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', sans-serif;
  --r-heading-font: var(--r-main-font);
  --r-main-font-size: 36px;
  --r-link-color: #5865f2;
  --r-selection-background-color: #5865f2;
}

.reveal :deep(.slides) {
  text-align: left;
}

.reveal :deep(section.slide-title),
.reveal :deep(section.slide-section) {
  text-align: center;
}

.reveal :deep(h1) {
  font-size: 2.2em;
  font-weight: 700;
  color: var(--r-heading-color);
}

.reveal :deep(h2) {
  font-size: 1.6em;
  font-weight: 700;
  color: var(--r-heading-color);
}

.reveal :deep(h3) {
  font-size: 1.2em;
  font-weight: 700;
  color: var(--r-heading-color);
  border-left: 6px solid #5865f2;
  padding-left: 16px;
  margin-bottom: 0.8em;
}

.appearance-light .hint {
  color: #8a8f98;
}

.reveal :deep(ul) {
  font-size: 0.85em;
  line-height: 1.8;
}

.reveal :deep(li::marker) {
  color: #5865f2;
}

.reveal :deep(.slide-image) {
  max-height: 55vh;
  max-width: 90%;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}

.reveal :deep(code) {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.9em;
  background: rgba(128, 138, 160, 0.18);
  border-radius: 6px;
  padding: 0.08em 0.35em;
}

.presenter-hud {
  position: absolute;
  right: 16px;
  top: 16px;
  z-index: 110;
  width: 280px;
  background: rgba(20, 21, 25, 0.92);
  border: 1px solid #4a4d55;
  border-radius: 8px;
  padding: 12px 14px;
  color: #d5d8dd;
  font-size: 13px;
  backdrop-filter: blur(6px);
}

.hud-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #9aa0a8;
}

.hud-timer {
  font-variant-numeric: tabular-nums;
}

.hud-notes,
.hud-next {
  margin-top: 8px;
}

.hud-notes strong,
.hud-next strong {
  display: block;
  font-size: 11px;
  color: #5865f2;
  margin-bottom: 2px;
}

.hud-notes p,
.hud-next p {
  margin: 0;
  white-space: pre-wrap;
  max-height: 140px;
  overflow: auto;
}

.exit-btn {
  position: absolute;
  left: 16px;
  top: 16px;
  z-index: 110;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #4a4d55;
  background: rgba(20, 21, 25, 0.7);
  color: #d5d8dd;
  font-size: 14px;
  cursor: pointer;
  opacity: 0.35;
  transition: opacity 0.2s;
}

.exit-btn:hover {
  opacity: 1;
}

.hint {
  position: absolute;
  left: 16px;
  bottom: 12px;
  z-index: 110;
  margin: 0;
  font-size: 12px;
  color: #6b7078;
  opacity: 0.5;
  pointer-events: none;
}
</style>
