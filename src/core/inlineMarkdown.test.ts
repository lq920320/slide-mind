import { describe, expect, it } from 'vitest'
import { hasInlineMarkdown, renderInlineMarkdown } from './inlineMarkdown'

describe('renderInlineMarkdown', () => {
  it('粗体/代码/斜体/删除线渲染为受控标签', () => {
    expect(renderInlineMarkdown('**重点**')).toBe('<strong>重点</strong>')
    expect(renderInlineMarkdown('用 `pnpm dev` 启动')).toBe('用 <code>pnpm dev</code> 启动')
    expect(renderInlineMarkdown('__加粗__ 与 *斜体* 与 ~~删除~~')).toBe(
      '<strong>加粗</strong> 与 <em>斜体</em> 与 <del>删除</del>',
    )
  })

  it('混合场景：前后缀与多个标记', () => {
    expect(renderInlineMarkdown('**第一次补货下架**：读 `cumulative = 100`')).toBe(
      '<strong>第一次补货下架</strong>：读 <code>cumulative = 100</code>',
    )
  })

  it('HTML 特殊字符先转义，防注入', () => {
    expect(renderInlineMarkdown('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    )
    expect(renderInlineMarkdown('`a < b && c > d`')).toBe(
      '<code>a &lt; b &amp;&amp; c &gt; d</code>',
    )
  })

  it('纯文本原样返回', () => {
    expect(renderInlineMarkdown('普通文字 100')).toBe('普通文字 100')
  })
})

describe('hasInlineMarkdown', () => {
  it('识别是否含内联标记', () => {
    expect(hasInlineMarkdown('**a**')).toBe(true)
    expect(hasInlineMarkdown('`code`')).toBe(true)
    expect(hasInlineMarkdown('普通文字')).toBe(false)
  })
})
