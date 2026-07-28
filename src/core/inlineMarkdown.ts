/**
 * 内联 Markdown 渲染器（零依赖）：把 `**粗体**`、`` `代码` ``、`*斜体*`、`~~删除线~~`
 * 渲染为受控 HTML 标签。先整体转义 HTML，再做符号替换，输出仅含
 * strong/code/em/del 标签，可安全用于 v-html 与 mind-elixir 的 markdown 选项。
 */
export function renderInlineMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
}

/** 是否包含可渲染的内联标记（用于跳过纯文本的处理开销） */
export function hasInlineMarkdown(text: string): boolean {
  return /`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|~~[^~]+~~/.test(text)
}
