import type { ModuleOptions } from '@nuxtjs/tailwindcss'

export const tailwindcss = {
  cssPath: ['~/assets/sass/tailwind.scss', { injectPosition: 'first' }],
  configPath: './tailwind.config.ts',
  exposeConfig: {
    level: 2,
  },
  config: {},
  viewer: true,
} satisfies Partial<ModuleOptions>
