// App-context augmentations: the Vue instance, the Nuxt app and the
// browser window. Here, not at the project root, because each Nuxt type
// context only sees the augmentations inside it.
import type { HookResult } from '@nuxt/schema'
import type { Ref } from 'vue'
import type { UseWebSocketReturn } from '@vueuse/core'

declare module 'vue' {
  interface ComponentCustomProperties {
    $authState: Ref<AllAuthResponse | AllAuthResponseError>
    $websocket (): UseWebSocketReturn<any> | null
  }
}

declare module '#app' {
  interface NuxtApp {
    $authState: Ref<AllAuthResponse | AllAuthResponseError>
    $websocket (): UseWebSocketReturn<any> | null
  }

  interface RuntimeNuxtHooks {
    'auth:change': (payload: { detail: AllAuthResponse | AllAuthResponseError, explicit?: boolean }) => HookResult
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
