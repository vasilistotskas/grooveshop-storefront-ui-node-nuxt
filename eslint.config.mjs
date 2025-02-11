// @ts-check
import eslintPluginTailwindCSS from 'eslint-plugin-tailwindcss'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  plugins: {
    tailwindcss: eslintPluginTailwindCSS,
  },
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
    'readable-tailwind/sort-classes': 'off',
    'readable-tailwind/multiline': 'off',
    'readable-tailwind/no-unnecessary-whitespace': 'off',
  },
  ignores: ['auto-imports.d.ts', 'components.d.ts', 'auth.d.ts'],
})
