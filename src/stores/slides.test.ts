import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { MindData } from '@/core/types'

const sampleMind: MindData = {
  nodeData: {
    id: 'root',
    topic: '根',
    children: [
      { id: 'a', topic: '甲', children: [{ id: 'a1', topic: '甲一' }] },
      { id: 'b', topic: '乙' },
    ],
  },
}

vi.mock('@/mindmap/adapter', () => ({
  mindMap: {
    getData: vi.fn(() => JSON.parse(JSON.stringify(sampleMind)) as MindData),
  },
  MIND_THEMES: [],
}))

import { useSlidesStore } from './slides'

describe('slidesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('loadSection(null) 依默认规则生成页序列，外观取设置默认值', () => {
    const slides = useSlidesStore()
    slides.loadSection(null)
    expect(slides.pages.map((p) => p.nodeId)).toEqual(['root', 'a', 'a1', 'b'])
    expect(slides.appearance).toBe('dark')
    expect(slides.canUndo).toBe(false)
  })

  it('movePage 调序后可撤销恢复', () => {
    const slides = useSlidesStore()
    slides.loadSection(null)
    slides.movePage(1, 3)
    expect(slides.pages.map((p) => p.nodeId)).toEqual(['root', 'a1', 'b', 'a'])
    expect(slides.canUndo).toBe(true)

    slides.undoArrangement()
    expect(slides.pages.map((p) => p.nodeId)).toEqual(['root', 'a', 'a1', 'b'])
    expect(slides.canUndo).toBe(false)
  })

  it('setHidden / setLayout 覆写生效且可撤销', () => {
    const slides = useSlidesStore()
    slides.loadSection(null)
    slides.setHidden('a1', true)
    slides.setLayout('a', 'content')
    expect(slides.visibleCount).toBe(3)
    expect(slides.pages.find((p) => p.nodeId === 'a')?.layout).toBe('content')

    slides.undoArrangement() // 撤销 setLayout
    expect(slides.pages.find((p) => p.nodeId === 'a')?.layout).toBe('section')
    slides.undoArrangement() // 撤销 setHidden
    expect(slides.visibleCount).toBe(4)
  })

  it('generateFromBranch 切换 rootId，undo 后恢复整图', () => {
    const slides = useSlidesStore()
    slides.loadSection(null)
    slides.generateFromBranch('a')
    expect(slides.section?.rootId).toBe('a')
    expect(slides.pages[0].nodeId).toBe('a')

    slides.undoArrangement()
    expect(slides.section?.rootId).toBeUndefined()
    expect(slides.pages[0].nodeId).toBe('root')
  })

  it('setAppearance 持久化到编排段并可撤销', () => {
    const slides = useSlidesStore()
    slides.loadSection(null)
    slides.setAppearance('light')
    expect(slides.appearance).toBe('light')
    slides.undoArrangement()
    expect(slides.appearance).toBe('dark')
  })

  it('历史快照与当前 section 解耦（撤销不受后续修改污染）', () => {
    const slides = useSlidesStore()
    slides.loadSection(null)
    slides.setHidden('b', true)
    // 直接改当前 meta（模拟继续编辑）
    slides.setNotes('b', '后续备注')
    slides.undoArrangement()
    expect(slides.pages.find((p) => p.nodeId === 'b')?.hidden).toBe(false)
    expect(slides.pages.find((p) => p.nodeId === 'b')?.notes).toBe('')
  })
})
