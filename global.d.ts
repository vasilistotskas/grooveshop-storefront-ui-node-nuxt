/* prettier-ignore */
// global.d.ts
import type { HookResult } from '@nuxt/schema'
import type { Ref } from 'vue'
import type { AllAuthResponse, AllAuthResponseError } from '~/types/all-auth'

export {}

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
