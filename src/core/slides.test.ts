import { describe, expect, it } from 'vitest'
import { buildSlideDoc, mindToSlides, syncSlides } from './slides'
import type { SlidesSection } from './slides'
import type { MindData } from './types'

const sample = (): MindData => ({
  nodeData: {
    id: 'root',
    topic: 'SlideMind 介绍',
    children: [
      {
        id: 'b1',
        topic: '为什么做',
        children: [
          {
            id: 'b1c1',
            topic: '痛点',
            children: [
              { id: 'b1c1-1', topic: '导图与演示割裂' },
              { id: 'b1c1-2', topic: '闭源收费' },
            ],
          },
        ],
      },
      {
        id: 'b2',
        topic: '怎么做',
        children: [
          {
            id: 'b2c1',
            topic: '架构图',
            image: { url: 'arch.png', width: 100, height: 80 },
          },
        ],
      },
    ],
  },
})

describe('mindToSlides 默认转换', () => {
  it('根节点生成封面页', () => {
    const doc = mindToSlides(sample())
    expect(doc.pages[0]).toMatchObject({ nodeId: 'root', layout: 'title', title: 'SlideMind 介绍' })
  })

  it('一级分支生成章节页，二级节点生成内容页/图片页', () => {
    const doc = mindToSlides(sample())
    expect(doc.pages.map((p) => p.layout)).toEqual([
      'title',
      'section',
      'content',
      'section',
      'image',
    ])
  })

  it('内容页的子节点渲染为 bullets', () => {
    const doc = mindToSlides(sample())
    const contentPage = doc.pages.find((p) => p.nodeId === 'b1c1')
    expect(contentPage?.bullets).toEqual(['导图与演示割裂', '闭源收费'])
  })

  it('图片页携带 image 且无 bullets', () => {
    const doc = mindToSlides(sample())
    const imagePage = doc.pages.find((p) => p.nodeId === 'b2c1')
    expect(imagePage?.layout).toBe('image')
    expect(imagePage?.image?.url).toBe('arch.png')
    expect(imagePage?.bullets).toEqual([])
  })

  it('无子节点的导图只生成封面页', () => {
    const doc = mindToSlides({ nodeData: { id: 'r', topic: 'solo' } })
    expect(doc.pages).toHaveLength(1)
  })
})

describe('syncSlides 增量同步', () => {
  it('appearance 默认为 dark，旧文件缺省时自动补齐，light 设置被保留', () => {
    const mind = sample()
    const fresh = syncSlides(mind, null)
    expect(fresh.config.appearance).toBe('dark')

    // 模拟旧版文件：config 缺 appearance
    const legacy = {
      ...fresh,
      config: { theme: 'default', aspectRatio: '16/9' },
    } as unknown as SlidesSection
    expect(syncSlides(mind, legacy).config.appearance).toBe('dark')

    const light = syncSlides(mind, {
      ...fresh,
      config: { ...fresh.config, appearance: 'light' },
    })
    expect(light.config.appearance).toBe('light')
  })

  it('保留用户顺序与覆写，新增节点按默认序插入', () => {
    const mind = sample()
    let section = syncSlides(mind, null)

    // 用户操作：把 b2 章节整体提前，并隐藏 b1c1
    section.pages = [
      section.pages[0], // root
      section.pages[3], // b2
      section.pages[4], // b2c1
      section.pages[1], // b1
      { ...section.pages[2], hidden: true, notes: '待补充' }, // b1c1
    ]

    // 导图变更：b1 下新增二级节点 b1c2
    mind.nodeData.children![0].children!.push({ id: 'b1c2', topic: '新痛点' })
    section = syncSlides(mind, section)

    expect(section.pages.map((p) => p.nodeId)).toEqual([
      'root',
      'b2',
      'b2c1',
      'b1',
      'b1c1',
      'b1c2', // 插在默认序前驱 b1c1 之后
    ])
    const b1c1 = section.pages.find((p) => p.nodeId === 'b1c1')
    expect(b1c1).toMatchObject({ hidden: true, notes: '待补充' })
  })

  it('节点删除后对应页被移除', () => {
    const mind = sample()
    let section = syncSlides(mind, null)
    mind.nodeData.children = mind.nodeData.children!.filter((c) => c.id !== 'b2')
    section = syncSlides(mind, section)
    expect(section.pages.map((p) => p.nodeId)).toEqual(['root', 'b1', 'b1c1'])
  })

  it('rootId 生效：仅从该分支生成，分支根为封面', () => {
    const mind = sample()
    const section = syncSlides(mind, { ...syncSlides(mind, null), rootId: 'b1', pages: [] })
    expect(section.rootId).toBe('b1')
    expect(section.pages.map((p) => p.nodeId)).toEqual(['b1', 'b1c1', 'b1c1-1', 'b1c1-2'])
    const doc = buildSlideDoc(mind, section)
    expect(doc.pages[0]).toMatchObject({ nodeId: 'b1', layout: 'title' })
  })

  it('rootId 节点被删除后回退整图并清除 rootId', () => {
    const mind = sample()
    let section: SlidesSection = { ...syncSlides(mind, null), rootId: 'b2' }
    mind.nodeData.children = mind.nodeData.children!.filter((c) => c.id !== 'b2')
    section = syncSlides(mind, section)
    expect(section.rootId).toBeUndefined()
    expect(section.pages[0].nodeId).toBe('root')
  })
})

describe('buildSlideDoc 渲染模型', () => {
  it('布局覆写优先于默认规则', () => {
    const mind = sample()
    const section = syncSlides(mind, null)
    section.pages.find((p) => p.nodeId === 'b1')!.layout = 'content'
    const doc = buildSlideDoc(mind, section)
    const b1 = doc.pages.find((p) => p.nodeId === 'b1')
    expect(b1?.layout).toBe('content')
    expect(b1?.bullets).toEqual(['痛点'])
  })

  it('节点改名后内容跟随导图更新', () => {
    const mind = sample()
    const section = syncSlides(mind, null)
    mind.nodeData.children![0].topic = '为什么要做'
    const doc = buildSlideDoc(mind, section)
    expect(doc.pages.find((p) => p.nodeId === 'b1')?.title).toBe('为什么要做')
  })

  it('备注与隐藏透传到渲染模型', () => {
    const mind = sample()
    const section = syncSlides(mind, null)
    const meta = section.pages.find((p) => p.nodeId === 'b2c1')!
    meta.notes = '讲 3 分钟'
    meta.hidden = true
    const doc = buildSlideDoc(mind, section)
    expect(doc.pages.find((p) => p.nodeId === 'b2c1')).toMatchObject({
      notes: '讲 3 分钟',
      hidden: true,
    })
  })
})
