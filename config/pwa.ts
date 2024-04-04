import type { ModuleOptions as PWAModuleOptions } from '@vite-pwa/nuxt'

const sw = process.env.SW === 'true'

export const pwa = {
  strategies: sw ? 'injectManifest' : 'generateSW',
  srcDir: sw ? 'service-worker' : undefined,
  filename: sw ? 'sw.ts' : undefined,
  injectRegister: 'auto',
  registerType: 'autoUpdate',
  manifest: {
    name: process.env.NUXT_PUBLIC_APP_TITLE || 'Grooveshop',
    short_name: process.env.NUXT_PUBLIC_APP_TITLE || 'Grooveshop',
    description:
      process.env.NUXT_PUBLIC_SITE_DESCRIPTION || 'Grooveshop Demo Storefront',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'any',
    categories: ['ecommerce', 'technology'],
    screenshots: [
      {
        src: '/screenshots/540x720.png',
        type: 'image/png',
        sizes: '540x720',
        form_factor: 'narrow',
      },
      {
        src: '/screenshots/540x720.png',
        type: 'image/png',
        sizes: '540x720',
        form_factor: 'narrow',
      },
      {
        src: '/screenshots/540x720.png',
        type: 'image/png',
        sizes: '540x720',
        form_factor: 'narrow',
      },
      {
        src: '/screenshots/1024x593.png',
        type: 'image/png',
        sizes: '1024x593',
        form_factor: 'wide',
      },
      {
        src: '/screenshots/1024x593.png',
        type: 'image/png',
        sizes: '1024x593',
        form_factor: 'wide',
      },
      {
        src: '/screenshots/1024x593.png',
        type: 'image/png',
        sizes: '1024x593',
        form_factor: 'wide',
      },
    ],
    icons: [
      {
        src: '/favicon/android-icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon/android-icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon/android-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon/android-icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/favicon/android-icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/favicon/android-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  },
  workbox: {
    navigateFallback: undefined,
    globPatterns: ['**/*.{js,css,html,json,webp,png,jpg,svg,ico}'],
    globIgnores: ['google*.html'],
    navigateFallbackDenylist: [/^\/api(?:\/.*)?$/],
    maximumFileSizeToCacheInBytes: 3000000,
    cleanupOutdatedCaches: true,
    sourcemap: true,
  },
  injectManifest: {
    globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
  },
  devOptions: {
    enabled: false,
    suppressWarnings: true,
    navigateFallback: undefined,
    type: 'module',
  },
  client: {
    installPrompt: true,
    periodicSyncForUpdates: 60 * 60,
  },
} satisfies PWAModuleOptions
