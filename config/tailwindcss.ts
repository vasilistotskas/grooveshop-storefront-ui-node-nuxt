import type { ModuleOptions } from '@nuxtjs/tailwindcss'

export const tailwindcss = {
  cssPath: ['~/assets/sass/tailwind.scss', { injectPosition: 'first' }],
  configPath: './tailwind.config.ts',
  exposeConfig: {
    level: 1,
  },
  viewer: true,
} satisfies Partial<ModuleOptions>
