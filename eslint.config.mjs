// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    ignores: ['auto-imports.d.ts', 'components.d.ts', 'auth.d.ts', 'shared'],
  },
  {
    rules: {
      'nuxt/prefer-import-meta': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/no-multiple-template-root': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/no-v-html': 'off',
      'vue/no-watch-after-await': 'warn',
      'vue/no-lifecycle-after-await': 'warn',
      'vue/attribute-hyphenation': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  })
