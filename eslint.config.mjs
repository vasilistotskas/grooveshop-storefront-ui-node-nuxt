import eslintPluginBetterTailwindcss from 'eslint-plugin-better-tailwindcss'
// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import { globalIgnores } from 'eslint/config'

export default withNuxt(
  globalIgnores([
    '**/test/',
    '**/openapi/',
    '**/.nuxt/**',
    '**/.output/**',
    '**/dist/**',
    '**/build/**',
    '**/node_modules/**',
    '**/.pnpm-store/**',
    '**/.cache/**',
    '**/.eslintcache',
    '**/coverage/**',
    '**/*.log',
    '**/logs/**',
    '**/skills/**',
  ]),
  {
    plugins: {
      'better-tailwindcss': eslintPluginBetterTailwindcss,
    },
  },
  {
    rules: {
      ...eslintPluginBetterTailwindcss.configs['recommended-warn'].rules,
      'better-tailwindcss/no-unknown-classes': ['warn', {
        detectComponentClasses: true,
        ignore: [
          'article',
          // NuxtUI
          'text-elevated*',
          'bg-elevated*',
          'border-elevated*',
          'ring-elevated*',
          'text-default*',
          'bg-default*',
          'border-default*',
          'ring-default*',
          'text-primary*',
          'bg-primary*',
          'border-primary*',
          'ring-primary*',
          'text-secondary*',
          'bg-secondary*',
          'border-secondary*',
          'ring-secondary*',
        ],
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
        attributes: [
          ['^v-bind:ui$', [
            { match: 'objectValues' },
          ]],
          ['^(?:v-bind:)?(activeClass|inactiveClass)$', [
            { match: 'strings' },
            { match: 'objectKeys' },
            { match: 'objectValues' },
          ]],
        ],
      },
    },
  },
)
