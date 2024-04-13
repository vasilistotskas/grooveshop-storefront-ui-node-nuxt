import type { ModuleOptions } from '@nuxt/image'

export const image = {
  dir: 'public',
  providers: {
    mediaStream: {
      name: 'mediaStream',
      provider: '~/providers/media-stream',
      options: {
        format: 'webp',
        width: 100,
        height: 100,
        fit: 'contain',
        position: 'entropy',
        background: 'transparent',
        trimThreshold: 5,
        path: '',
      },
    },
  },
  screens: {
    'xs': 320,
    'sm': 640,
    'md': 768,
    'lg': 1024,
    'xl': 1280,
    'xxl': 1536,
    '2xl': 1536,
  },
} satisfies Partial<ModuleOptions>
