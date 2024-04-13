// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'nuxt/prefer-import-meta': 'off',
    'vue/multi-word-component-names': 0,
    'vue/no-multiple-template-root': 'off',
    'vue/max-attributes-per-line': 'off',
    'vue/no-v-html': 0,
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
  },
  languageOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest',
  },
  ignores: ['components.d.ts', 'auto-imports.d.ts', 'nuxt.d.ts', 'dist', '.nuxt', 'node_modules', 'output'],
})
