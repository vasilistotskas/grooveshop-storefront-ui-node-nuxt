import eslintPluginBetterTailwindcss from 'eslint-plugin-better-tailwindcss'
// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import { globalIgnores } from 'eslint/config'

export default withNuxt(
  globalIgnores(['**/tests/', '**/openapi/']),
  {
    plugins: {
      'better-tailwindcss': eslintPluginBetterTailwindcss,
    },
  },
  {
    rules: {
      ...eslintPluginBetterTailwindcss.configs['recommended-warn'].rules,
      'better-tailwindcss/no-unregistered-classes': ['warn', {
        detectComponentClasses: true,
        ignore: ['article'],
      }],
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
  },
  {
    settings: {
      'better-tailwindcss': {
        entryPoint: 'app/assets/css/main.css',
        variables: [],
      },
    },
  },
)
