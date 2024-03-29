import type { ModuleOptions } from '@nuxtjs/html-validator'

export const htmlValidator = {
  usePrettier: false,
  logLevel: 'verbose',
  failOnError: false,
  options: {
    extends: [
      'html-validate:document',
      'html-validate:recommended',
      'html-validate:standard',
    ],
    rules: {
      'svg-focusable': 'off',
      'no-unknown-elements': 'error',
      // Conflicts or not needed as we use prettier formatting
      'void-style': 'off',
      'no-trailing-whitespace': 'off',
      // Conflict with Nuxt defaults
      'require-sri': 'off',
      'attribute-boolean-style': 'off',
      'doctype-style': 'off',
      // Unreasonable rule
      'no-inline-style': 'off',
      'prefer-native-element': 'off',
    },
  },
} satisfies Partial<ModuleOptions>
