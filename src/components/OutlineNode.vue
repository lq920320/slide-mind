<script setup lang="ts">
import type { MindNode } from '@/core/types'

defineProps<{ node: MindNode; depth: number; activeId?: string | null }>()
const emit = defineEmits<{ locate: [id: string] }>()
</script>

<template>
  <div class="outline-node">
    <button
      class="outline-item"
      :class="{ active: node.id === activeId }"
      :style="{ paddingLeft: `${8 + depth * 14}px` }"
      :title="node.topic"
      :data-node-id="node.id"
      @click="emit('locate', node.id)"
    >
      {{ node.topic }}
    </button>
    <OutlineNode
      v-for="child in node.children ?? []"
      :key="child.id"
      :node="child"
      :depth="depth + 1"
      :active-id="activeId"
      @locate="(id) => emit('locate', id)"
    />
  </div>
</template>

<style scoped>
.outline-item {
  display: block;
  width: 100%;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  font-size: 13px;
  line-height: 1.4;
  padding: 4px 8px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: 4px;
}
.outline-item:hover {
  background: rgba(120, 120, 160, 0.15);
}
.outline-item.active {
  background: rgba(88, 101, 242, 0.35);
  color: #fff;
}
</style>
