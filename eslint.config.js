import nuxt from './.nuxt/eslint.config.mjs'

export default [
  ...nuxt,
  {
    rules: {
      'nuxt/prefer-import-meta': 'off',
      'vue/multi-word-component-names': 0,
      'vue/no-multiple-template-root': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/no-v-html': 0,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off'
    }
  }
]
