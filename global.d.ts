/* prettier-ignore */
// global.d.ts
import type { HookResult } from '@nuxt/schema'
import type { Ref } from 'vue'
import type { UseWebSocketReturn } from '@vueuse/core'

declare module 'vue' {
  interface ComponentCustomProperties {
    $authState: Ref<AllAuthResponse>
    $websocket (): UseWebSocketReturn<any> | null
  }
}

declare module '#app' {
  interface NuxtApp {
    $authState: Ref<AllAuthResponse>
    $websocket (): UseWebSocketReturn<any> | null
  }

  interface RuntimeNuxtHooks {
    'auth:change': ({ detail }: { detail: AllAuthResponse | AllAuthResponseError }) => HookResult
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

export {}
