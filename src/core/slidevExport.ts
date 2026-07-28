import type { SlideDoc, SlidePage } from './types'

/**
 * SlideDoc → Slidev Markdown（slides.md）
 * 布局映射：title → cover；section → section；content → default；image → image
 * 演讲备注 → 每页末尾的 HTML 注释（Slidev speaker notes 语法）
 * 隐藏页不导出
 */
export function slideDocToSlidevMarkdown(doc: SlideDoc): string {
  const pages = doc.pages.filter((p) => !p.hidden)
  if (!pages.length) return ''

  const blocks = pages.map((page, i) => renderPage(page, i === 0, doc))
  return `${blocks.join('\n\n---\n')}\n`
}

function renderPage(page: SlidePage, isFirst: boolean, doc: SlideDoc): string {
  const fm: string[] = []
  if (isFirst) {
    // 首页 frontmatter 即 Slidev headmatter（全局配置 + 首页布局）
    fm.push(`theme: ${doc.config.theme}`, `title: ${escapeYaml(page.title)}`)
  }

  switch (page.layout) {
    case 'title':
      fm.push('layout: cover')
      break
    case 'section':
      fm.push('layout: section')
      break
    case 'image':
      fm.push('layout: image')
      if (page.image) fm.push(`image: ${page.image.url}`)
      break
    case 'content':
      break
  }

  const lines: string[] = []
  // 首页：完整 headmatter 块；后续页：块首的 '---' 由 join 分隔符提供，
  // 故有 frontmatter 时只保留 「fm 行 + '---'」，无 frontmatter 时直接接内容
  if (isFirst || fm.length) {
    lines.push('---', ...fm, '---', '')
  } else {
    lines.push('')
  }

  lines.push(`# ${page.title}`)

  if (page.layout === 'content' && page.bullets.length) {
    lines.push('', ...page.bullets.map((b) => `- ${b}`))
  }

  if (page.notes.trim()) {
    lines.push('', '<!--', page.notes.trim(), '-->')
  }

  return lines.join('\n').replace(/^---\n/, isFirst ? '---\n' : '')
}

function escapeYaml(text: string): string {
  return /[:#[\]{}"'|>&*!%@`]/.test(text) ? JSON.stringify(text) : text
}
