import { describe, expect, it } from 'vitest'
import { slideDocToSlidevMarkdown } from './slidevExport'
import type { SlideDoc } from './types'

const doc = (): SlideDoc => ({
  config: { theme: 'default', aspectRatio: '16/9', appearance: 'dark' },
  pages: [
    {
      nodeId: 'root',
      layout: 'title',
      title: '产品介绍',
      bullets: [],
      notes: '开场白',
      hidden: false,
    },
    { nodeId: 'b1', layout: 'section', title: '第一章', bullets: [], notes: '', hidden: false },
    {
      nodeId: 'c1',
      layout: 'content',
      title: '要点',
      bullets: ['优势 A', '优势 B'],
      notes: '',
      hidden: false,
    },
    {
      nodeId: 'c2',
      layout: 'image',
      title: '架构',
      bullets: [],
      image: { url: 'arch.png', width: 1, height: 1 },
      notes: '',
      hidden: false,
    },
    { nodeId: 'c3', layout: 'content', title: '内部页', bullets: [], notes: '', hidden: true },
  ],
})

describe('slideDocToSlidevMarkdown', () => {
  it('首页输出 headmatter（theme/title/layout: cover）', () => {
    const md = slideDocToSlidevMarkdown(doc())
    expect(md.startsWith('---\ntheme: default\ntitle: 产品介绍\nlayout: cover\n---\n')).toBe(true)
  })

  it('章节页与图片页带 layout frontmatter，内容页无 frontmatter', () => {
    const md = slideDocToSlidevMarkdown(doc())
    expect(md).toContain('---\nlayout: section\n---\n\n# 第一章')
    expect(md).toContain('---\nlayout: image\nimage: arch.png\n---\n\n# 架构')
    expect(md).toContain('---\n\n# 要点\n\n- 优势 A\n- 优势 B')
  })

  it('备注导出为 HTML 注释（speaker notes）', () => {
    const md = slideDocToSlidevMarkdown(doc())
    expect(md).toContain('<!--\n开场白\n-->')
  })

  it('隐藏页不导出', () => {
    const md = slideDocToSlidevMarkdown(doc())
    expect(md).not.toContain('内部页')
  })

  it('标题含 YAML 特殊字符时加引号', () => {
    const d = doc()
    d.pages[0].title = '标题: 含冒号'
    const md = slideDocToSlidevMarkdown(d)
    expect(md).toContain('title: "标题: 含冒号"')
  })

  it('空文档返回空字符串', () => {
    expect(slideDocToSlidevMarkdown({ config: doc().config, pages: [] })).toBe('')
  })
})
