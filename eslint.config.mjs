// @ts-check
import eslintPluginReadableTailwind from 'eslint-plugin-readable-tailwind'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  plugins: {
    'readable-tailwind': eslintPluginReadableTailwind,
  },
  rules: {
    'nuxt/prefer-import-meta': 'off',
    'vue/multi-word-component-names': 'off',
    'vue/no-multiple-template-root': 'off',
    'vue/max-attributes-per-line': 'off',
    'vue/no-v-html': 'off',
    'vue/no-watch-after-await': 'warn',
    'vue/no-lifecycle-after-await': 'warn',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    ...eslintPluginReadableTailwind.configs.warning.rules,
    ...eslintPluginReadableTailwind.configs.error.rules,
  },
  ignores: ['auto-imports.d.ts'],
})
