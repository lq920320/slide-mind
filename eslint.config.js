import eslint from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import prettierConfig from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/**', 'src-tauri/target/**', 'src-tauri/gen/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // 幻灯片标题/要点的内联 Markdown 渲染：内容经 renderInlineMarkdown 全量 HTML 转义
    // 后仅输出受控标签（strong/code/em/del），非用户可控 HTML，见 core/inlineMarkdown 防注入测试
    files: ['src/components/PresentationView.vue', 'src/components/SlidePanel.vue'],
    rules: {
      'vue/no-v-html': 'off',
    },
  },
  prettierConfig,
)
