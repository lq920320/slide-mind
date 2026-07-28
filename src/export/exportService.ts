import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { snapdom } from '@zumer/snapdom'
import { jsPDF } from 'jspdf'
import { slideDocToSlidevMarkdown } from '@/core/slidevExport'
import { mindToMarkdown } from '@/core/markdownOutline'
import type { SlideAppearance, SlidePage } from '@/core/types'
import { t } from '@/i18n'
import { mindMap } from '@/mindmap/adapter'
import { useDocumentStore } from '@/stores/document'
import { useSlidesStore } from '@/stores/slides'

const PAGE_W = 1280
const PAGE_H = 720

/** 导出 Slidev Markdown（slides.md） */
export async function exportSlidevMarkdown(): Promise<string | null> {
  const slides = useSlidesStore()
  slides.refresh()
  if (!slides.doc) return null

  const target = await save({
    filters: [{ name: t('dialog.slidevFilter'), extensions: ['md'] }],
    defaultPath: `${docTitle()}-slides.md`,
  })
  if (!target) return null

  const content = slideDocToSlidevMarkdown(slides.doc)
  await invoke('write_document', { path: target, content })
  return target
}

/** 逐页导出 PNG 到所选目录，返回导出数量 */
export async function exportSlidesPng(): Promise<number> {
  const pages = visiblePages()
  if (!pages.length) return 0

  const dir = await open({ directory: true, multiple: false, title: t('dialog.pngDirTitle') })
  if (typeof dir !== 'string') return 0

  const title = docTitle()
  for (let i = 0; i < pages.length; i++) {
    const dataUrl = await renderPageToDataUrl(pages[i])
    const name = `${title}-${String(i + 1).padStart(2, '0')}.png`
    await invoke('write_binary_base64', { path: `${dir}/${name}`, data: stripDataUrl(dataUrl) })
  }
  return pages.length
}

/** 导出整份 PDF（16:9 横向，每页一图） */
export async function exportSlidesPdf(): Promise<string | null> {
  const pages = visiblePages()
  if (!pages.length) return null

  const target = await save({
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    defaultPath: `${docTitle()}.pdf`,
  })
  if (!target) return null

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [PAGE_W, PAGE_H] })
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage([PAGE_W, PAGE_H], 'landscape')
    const dataUrl = await renderPageToDataUrl(pages[i])
    pdf.addImage(dataUrl, 'PNG', 0, 0, PAGE_W, PAGE_H)
  }

  const bytes = new Uint8Array(pdf.output('arraybuffer'))
  await invoke('write_binary_base64', { path: target, data: bytesToBase64(bytes) })
  return target
}

/** 导出为 XMind 文件（官方生态包打包 zip；传拷贝避免原地修改画布数据） */
export async function exportXmind(): Promise<string | null> {
  const target = await save({
    filters: [{ name: 'XMind', extensions: ['xmind'] }],
    defaultPath: `${docTitle()}.xmind`,
  })
  if (!target) return null

  const { data2Xmind } = await import('@mind-elixir/export-xmind')
  const data = JSON.parse(JSON.stringify(mindMap.getData()))
  const blob = await data2Xmind(data)
  const bytes = new Uint8Array(await blob.arrayBuffer())
  await invoke('write_binary_base64', { path: target, data: bytesToBase64(bytes) })
  return target
}

/** 导出导图为 Markdown 大纲 */
export async function exportMarkdownOutline(): Promise<string | null> {
  const target = await save({
    filters: [{ name: 'Markdown', extensions: ['md'] }],
    defaultPath: `${docTitle()}.md`,
  })
  if (!target) return null
  const content = mindToMarkdown(useDocumentStore().doc.mindmap)
  await invoke('write_document', { path: target, content })
  return target
}

function docTitle(): string {
  const title = useDocumentStore().doc.mindmap.nodeData.topic.trim()
  return title.replace(/[/\\:*?"<>|]/g, '_') || 'slides'
}

function visiblePages(): SlidePage[] {
  const slides = useSlidesStore()
  slides.refresh()
  return slides.pages.filter((p) => !p.hidden)
}

/** 离屏构建单页 DOM（与演示视图同风格的简化版，跟随明暗外观），snapdom 栅格化为 dataURL */
async function renderPageToDataUrl(page: SlidePage): Promise<string> {
  const el = buildSlideElement(page, useSlidesStore().appearance)
  document.body.appendChild(el)
  try {
    const result = await snapdom(el, { width: PAGE_W, height: PAGE_H })
    const canvas = await result.toCanvas()
    return canvas.toDataURL('image/png')
  } finally {
    el.remove()
  }
}

function buildSlideElement(page: SlidePage, appearance: SlideAppearance): HTMLDivElement {
  const colors =
    appearance === 'light'
      ? { bg: '#f7f8fa', text: '#2c3138', heading: '#16181d' }
      : { bg: '#191a1e', text: '#e8eaf0', heading: '#ffffff' }

  const el = document.createElement('div')
  el.style.cssText = [
    `width:${PAGE_W}px`,
    `height:${PAGE_H}px`,
    'position:fixed',
    'left:-99999px',
    'top:0',
    'box-sizing:border-box',
    `background:${colors.bg}`,
    `color:${colors.text}`,
    'padding:64px 80px',
    'display:flex',
    'flex-direction:column',
    "font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif",
  ].join(';')

  const centered = page.layout === 'title' || page.layout === 'section'
  if (centered) {
    el.style.justifyContent = 'center'
    el.style.alignItems = 'center'
    el.style.textAlign = 'center'
  }

  const heading = document.createElement('div')
  heading.textContent = page.title
  if (page.layout === 'title') {
    heading.style.cssText = `font-size:72px;font-weight:700;color:${colors.heading}`
  } else if (page.layout === 'section') {
    heading.style.cssText = `font-size:56px;font-weight:700;color:${colors.heading}`
  } else {
    heading.style.cssText = `font-size:40px;font-weight:700;color:${colors.heading};border-left:8px solid #5865f2;padding-left:20px;margin-bottom:36px`
  }
  el.appendChild(heading)

  if (page.layout === 'content' && page.bullets.length) {
    const ul = document.createElement('ul')
    ul.style.cssText = 'font-size:30px;line-height:2;margin:0;padding-left:40px'
    for (const b of page.bullets) {
      const li = document.createElement('li')
      li.textContent = b
      ul.appendChild(li)
    }
    el.appendChild(ul)
  }

  if (page.layout === 'image' && page.image) {
    const img = document.createElement('img')
    img.src = page.image.url
    img.style.cssText = 'flex:1;min-height:0;object-fit:contain;margin:0 auto;max-width:90%'
    el.appendChild(img)
  }

  return el
}

function stripDataUrl(dataUrl: string): string {
  return dataUrl.replace(/^data:image\/png;base64,/, '')
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}
