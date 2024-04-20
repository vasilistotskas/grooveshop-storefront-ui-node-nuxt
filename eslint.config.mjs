// @ts-check
import eslintPluginReadableTailwind from 'eslint-plugin-readable-tailwind'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  plugins: {
    'readable-tailwind': eslintPluginReadableTailwind,
  },
  rules: {
    'nuxt/prefer-import-meta': 'off',
    'vue/multi-word-component-names': 0,
    'vue/no-multiple-template-root': 'off',
    'vue/max-attributes-per-line': 'off',
    'vue/no-v-html': 0,
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    ...eslintPluginReadableTailwind.configs.warning.rules,
    ...eslintPluginReadableTailwind.configs.error.rules,
  },
})
