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

  interface PageMeta {
    /**
     * What a sign-in started on the page brings the shopper back to
     * (`next`, `returnTarget`). Without it, the page's path alone.
     * `'path-and-query'`: its query is view state worth keeping (the
     * listing's sort, filters and page, a search). `'nowhere'`: its path is
     * a one-time token (an unsubscribe, a confirmation, a preview), which no
     * sign-in page's address may carry.
     */
    signInReturn?: 'path-and-query' | 'nowhere'
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
