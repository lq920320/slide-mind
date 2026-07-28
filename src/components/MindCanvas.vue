<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AppLocale } from '@/i18n'
import { mindMap } from '@/mindmap/adapter'
import { useDocumentStore } from '@/stores/document'
import { useSlidesStore } from '@/stores/slides'

const container = ref<HTMLDivElement>()
const { t, locale } = useI18n()
const store = useDocumentStore()
const slides = useSlidesStore()
let offChange: (() => void) | undefined

function mountMindMap(data = store.doc.mindmap) {
  if (!container.value) return
  mindMap.init(container.value, data, {
    locale: locale.value as AppLocale,
    contextMenuExtensions: [
      {
        name: t('slides.genFromBranchMenu'),
        handler: (nodeId) => slides.generateFromBranch(nodeId),
      },
    ],
  })
  store.syncOutline()
}

onMounted(() => {
  mountMindMap()
  offChange = mindMap.onChange(() => store.handleMindChange())
})

// 语言切换后重建实例，使 mind-elixir 右键菜单与扩展项文案跟随
watch(locale, () => {
  try {
    mountMindMap(mindMap.getData())
  } catch {
    mountMindMap()
  }
})

onBeforeUnmount(() => {
  offChange?.()
  mindMap.destroy()
})
</script>

<template>
  <div ref="container" class="mind-canvas" />
</template>

<style scoped>
.mind-canvas {
  width: 100%;
  height: 100%;
}
</style>
