<p align="center">
  <img src="src-tauri/icons/128x128.png" alt="SlideMind" width="96" />
</p>

<h1 align="center">SlideMind</h1>

<p align="center">
  思维导图 + 幻灯片演示 一体化的开源桌面应用<br/>
  边画导图，边生成可放映的幻灯片 —— 类似 XMind 的演示模式，但完全开源
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"/></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg" alt="Platforms"/>
  <img src="https://img.shields.io/badge/built%20with-Tauri%202%20%2B%20Vue%203-5865f2.svg" alt="Tauri + Vue"/>
</p>

---

## ✨ 特性

- 🧠 **思维导图编辑**：基于 [mind-elixir](https://github.com/SSShooter/mind-elixir-core)，拖拽、快捷键、多主题、大纲视图、节点搜索
- 🎞️ **导图秒变幻灯片**：根节点 → 封面、一级分支 → 章节、二级节点 → 内容页；导图改动实时同步，编排（顺序/布局/备注/隐藏）永不丢失
- 📽️ **一键演示**：F5 全屏放映（reveal.js），要点渐进出现，演讲者视图（备注 + 下一页 + 计时器）
- 🔀 **分支演示**：像 XMind Pitch 一样，只讲选中的那个分支
- 📤 **开放导出**：[Slidev](https://sli.dev) Markdown（可直接 `slidev slides.md` 深加工）、PDF、逐页 PNG
- 📥 **XMind 导入**：`.xmind`（2020+ 格式）一键迁移
- 💾 **本地优先**：`.smind` 开放 JSON 格式，自动保存 + 崩溃备份，无需联网
- 🌍 中文 / English

## 📦 安装

从 [Releases](https://github.com/lq920320/slide-mind/releases) 下载对应平台安装包：

| 平台                          | 格式                   |
| ----------------------------- | ---------------------- |
| macOS (Apple Silicon / Intel) | `.dmg`                 |
| Windows                       | `.msi` / `.exe` (NSIS) |
| Linux                         | `.AppImage` / `.deb`   |

## 🚀 开发

```bash
# 环境要求：Node.js 22+、pnpm 10+、Rust 1.85+
pnpm install
pnpm tauri dev     # 启动桌面应用（开发模式）

pnpm test          # 前端单测（Vitest）
pnpm lint          # ESLint
cd src-tauri && cargo test   # Rust 单测
```

## 🏗️ 架构一览

```
mind-elixir 导图（唯一数据源）
      │  nodeId 关联
      ▼
SlidesSection 编排段（顺序/布局/备注/隐藏，随 .smind 持久化）
      │  syncSlides 增量同步 + buildSlideDoc 计算
      ▼
SlideDoc 渲染模型 ──▶ reveal.js 应用内演示
                  ──▶ Slidev Markdown / PDF / PNG 导出
```

详细设计见 [doc/01-技术调研与方案选型.md](doc/01-技术调研与方案选型.md) 与 [doc/02-开发计划.md](doc/02-开发计划.md)。

## 🤝 参与贡献

欢迎 Issue 与 PR！请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 📄 许可证

[MIT](LICENSE)
