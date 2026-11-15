import { describe, it, expect } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'

/**
 * A component hydrated lazily, on a page served from the cache, hydrates
 * after the session has arrived. Its first render must still be the one the
 * anonymous server sent, so the session it reads is the guest's until it has
 * mounted.
 */
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 9 }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

describe('useSessionAfterHydration', () => {
  it('draws the guest on the first render and the signed-in reader once mounted', async () => {
    const drawn: string[] = []
    const Probe = defineComponent({
      setup() {
        const { loggedIn, user } = useSessionAfterHydration()
        return () => {
          drawn.push(`${loggedIn.value}:${user.value?.id ?? 'none'}`)
          return h('div')
        }
      },
    })

    await mountSuspended(Probe, { route: false })

    expect(drawn[0]).toBe('false:none')
    expect(drawn.at(-1)).toBe('true:9')
  })
})
