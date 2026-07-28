# 参与贡献

感谢你对 SlideMind 的兴趣！

## 开发环境

- Node.js 22+ / pnpm 10+ / Rust 1.85+（stable）
- macOS、Windows、Linux 均可开发；桌面调试运行 `pnpm tauri dev`

## 项目结构

```
src/
├── core/        # 领域核心（纯 TS，零依赖，禁止 import Vue/Tauri/mind-elixir）
├── mindmap/     # mind-elixir 适配层（业务代码不得直接触碰第三方导图 API）
├── stores/      # Pinia 状态
├── components/  # Vue 组件
├── views/       # 页面视图
├── export/      # 导出服务（按需动态加载）
└── i18n/        # 中/英文案
src-tauri/       # Rust 后端（文件 IO、XMind 解包、updater）
doc/             # 调研、开发计划、发布指南
```

## 提交前自检

```bash
pnpm lint && pnpm format:check   # 代码风格
pnpm test                        # 前端单测
pnpm build                       # 类型检查 + 构建
cd src-tauri && cargo fmt --check && cargo clippy && cargo test
```

## 约定

1. **core 层保持零依赖**：`src/core` 的模块必须可被 Node/浏览器直接运行，新转换逻辑必须带单测。
2. **导图是唯一数据源**：幻灯片内容永远由导图节点派生，编排信息（顺序/布局/备注/隐藏）只存 `SlidesSection`。
3. **用户可见文案走 i18n**：新增 UI 字符串同时提供 `zh` 与 `en`（`src/i18n/index.ts`）。
4. 提交信息使用祈使句，例如 `feat: add markdown outline import`。

## 报告问题

请使用 Issue 模板，附上操作系统、应用版本与复现步骤；涉及文件损坏问题请附 `.smind`（或脱敏样本）与同目录 `.smind.bak`。
