declare module '@mind-elixir/export-xmind' {
  import type { MindElixirData, MindElixirInstance } from 'mind-elixir'

  /** 将 mind-elixir 数据打包为 .xmind Blob（注意：会原地修改传入数据，需传拷贝） */
  export function data2Xmind(data: MindElixirData, version?: string): Promise<Blob>

  /** 作为 mind-elixir 插件安装（挂载 exportXmind / exportXmindFile 方法） */
  export default function install(mind: MindElixirInstance): void
}
