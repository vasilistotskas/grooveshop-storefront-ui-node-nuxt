/* prettier-ignore */
// global.d.ts
import type { HookResult } from '@nuxt/schema'
import type { Ref } from 'vue'
import { z } from 'zod'
import type { AllAuthResponse, AllAuthResponseError } from '~/types/all-auth'

export {}

const _envVariables = z.object({
  NODE_ENV: z.string(),
  SW: z.string(),
  NODE_AUTH_TOKEN: z.string(),
  VITEST_DOM_ENV: z.string(),

  // App
  NUXT_DJANGO_URL: z.string(),
  NUXT_SECRET_KEY: z.string(),
  NUXT_CACHE_BASE: z.string(),
  NUXT_CACHE_MAX_AGE: z.string(),
  NUXT_REDIS_HOST: z.string(),
  NUXT_REDIS_PORT: z.string(),

  // Info
  NUXT_PUBLIC_ENVIRONMENT: z.enum(['development', 'production', 'demo']),
  NUXT_PUBLIC_APP_TITLE: z.string(),
  NUXT_PUBLIC_APP_DESCRIPTION: z.string(),
  NUXT_PUBLIC_APP_KEYWORDS: z.string(),
  NUXT_PUBLIC_SITE_DESCRIPTION: z.string(),
  NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION: z.string(),
  NUXT_PUBLIC_APP_LOGO: z.string(),

  // Public
  NUXT_PUBLIC_TITLE_SEPARATOR: z.string(),
  NUXT_PUBLIC_DOMAIN_NAME: z.string(),
  NUXT_PUBLIC_BASE_URL: z.string(),
  NUXT_PUBLIC_DJANGO_URL: z.string(),
  NUXT_PUBLIC_DJANGO_HOST: z.string(),
  NUXT_PUBLIC_DJANGO_HOSTNAME: z.string(),
  NUXT_PUBLIC_DJANGO_STATIC_URL: z.string(),
  NUXT_PUBLIC_API_BASE_URL: z.string(),
  NUXT_PUBLIC_MEDIA_STREAM_DOMAIN: z.string(),
  NUXT_PUBLIC_MEDIA_STREAM_ORIGIN: z.string(),
  NUXT_PUBLIC_MEDIA_STREAM_PATH: z.string(),
  NUXT_PUBLIC_SITE_URL: z.string(),
  NUXT_PUBLIC_TRAILING_SLASH: z.string(),
  NUXT_PUBLIC_SITE_NAME: z.string(),
  NUXT_PUBLIC_GOOGLE_GSI_ENABLE: z.string(),

  // Locales
  NUXT_PUBLIC_LOCALES: z.string(),
  NUXT_PUBLIC_LANGUAGE: z.string(),
  NUXT_PUBLIC_DEFAULT_LOCALE: z.string(),
  NUXT_PUBLIC_I18N_DEBUG: z.string(),

  // Private
  NUXT_SESSION_PASSWORD: z.string(),

  // Author
  NUXT_PUBLIC_AUTHOR_NAME: z.string(),
  NUXT_PUBLIC_AUTHOR_GITHUB_URL: z.string(),

  // Facebook
  NUXT_PUBLIC_FACEBOOK_APP_ID: z.string(),

  // Google Tag Manager
  NUXT_PUBLIC_SCRIPTS_GOOGLE_ANALYTICS_ID: z.string(),

  // Experimental
  NUXT_PUBLIC_EXPERIMENTAL_WATCHER: z.string(),

  // Auth
  NUXT_AUTH_COOKIE_DOMAIN: z.string(),
  NUXT_AUTH_BASE_URL: z.string(),
  NUXT_OAUTH_GOOGLE_CLIENT_ID: z.string(),
  NUXT_OAUTH_GOOGLE_CLIENT_SECRET: z.string(),
  NUXT_OAUTH_DISCORD_CLIENT_ID: z.string(),
  NUXT_OAUTH_DISCORD_CLIENT_SECRET: z.string(),
  NUXT_OAUTH_GITHUB_CLIENT_ID: z.string(),
  NUXT_OAUTH_GITHUB_CLIENT_SECRET: z.string(),
  NUXT_OAUTH_FACEBOOK_CLIENT_ID: z.string(),
  NUXT_OAUTH_FACEBOOK_CLIENT_SECRET: z.string(),

  // Socials
  NUXT_PUBLIC_SOCIALS_FACEBOOK: z.string(),
  NUXT_PUBLIC_SOCIALS_TWITTER: z.string(),
  NUXT_PUBLIC_SOCIALS_TIKTOK: z.string(),
  NUXT_PUBLIC_SOCIALS_YOUTUBE: z.string(),
  NUXT_PUBLIC_SOCIALS_INSTAGRAM: z.string(),
  NUXT_PUBLIC_SOCIALS_DISCORD: z.string(),
  NUXT_PUBLIC_SOCIALS_REDDIT: z.string(),
  NUXT_PUBLIC_SOCIALS_PINTEREST: z.string(),

  // Turnstile
  NUXT_TURNSTILE_SECRET_KEY: z.string(),
  NUXT_PUBLIC_TURNSTILE_SITE_KEY: z.string(),
})

declare module 'vue' {
  export interface GlobalComponents {
    VDatePicker: (typeof import('v-calendar'))['DatePicker']
    VCalendar: (typeof import('v-calendar'))['Calendar']
  }
}

declare module '#app' {
  interface NuxtApp {
    $authState: Ref<AllAuthResponse>
  }

  interface RuntimeNuxtHooks {
    'auth:change': ({ detail }: { detail: AllAuthResponse | AllAuthResponseError }) => HookResult
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $authState: Ref<AllAuthResponse>
  }
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof _envVariables> {
      _dummy?: string
    }
  }

  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string
            callback: (token: { client_id: string, credential: string }) => void
          }) => void
          prompt: () => void
        }
      }
    }
  }
}
