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
  },
} satisfies Partial<ModuleOptions>
