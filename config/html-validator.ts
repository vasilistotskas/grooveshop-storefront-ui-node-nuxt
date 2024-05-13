import type { ModuleOptions } from '@nuxtjs/html-validator'

export const htmlValidator = {
  usePrettier: false,
  logLevel: 'verbose',
  failOnError: false,
  options: {
    rules: {
      'unrecognized-char-ref': 'off',
      'wcag/h37': 'warn',
      'element-permitted-content': 'warn',
      'element-required-attributes': 'warn',
      'attribute-empty-style': 'off',
    },
  },
} satisfies Partial<ModuleOptions>
