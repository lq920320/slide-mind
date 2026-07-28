/**
 * 领域核心错误：以错误码 + 参数表达，UI 层负责 i18n 文案映射。
 * core 保持零依赖，不感知任何翻译框架。
 */
export type CoreErrorCode =
  | 'invalidJson'
  | 'unsupportedVersion'
  | 'missingMindmap'
  | 'xmindInvalidJson'
  | 'xmindMissingRoot'
  | 'markdownNoHeading'

export class CoreError extends Error {
  constructor(
    public readonly code: CoreErrorCode,
    public readonly params?: Record<string, string | number>,
  ) {
    super(code)
    this.name = 'CoreError'
  }
}
