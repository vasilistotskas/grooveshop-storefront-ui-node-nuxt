import type { ModuleOptions } from '@nuxt/eslint'

export const eslint = {
  checker: true,
  config: {
    stylistic: true,
  },
} satisfies Partial<ModuleOptions>
