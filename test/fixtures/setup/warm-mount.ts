import { beforeAll } from 'vitest'

/**
 * Pay the first-mount warm-up in a hook, not in whichever test mounts first.
 *
 * The first `mountSuspended` in a file renders through the Nuxt app shell,
 * and Vite transforms that module graph on demand — several seconds, once
 * per file. Left to the first test, it lands on the test budget (5s) and
 * fails the test for work it did not do: measured on 2026-09-30, the first
 * test of three files took 8-16s while every later test took under 150ms,
 * and an EMPTY component mounted first took the same 7-9s. `beforeAll`
 * runs under `hookTimeout` (60s for this project), which is sized for it.
 *
 * Must run after the @nuxt/test-utils entry, which calls
 * `vi.resetModules()` and starts the app in its own `beforeAll` —
 * `withSetupFileAfterNuxt` in vitest.config.mts appends this file behind
 * it. The runtime helpers are imported INSIDE the hook so they bind to the
 * app that hook just created rather than to a pre-reset module instance.
 */
beforeAll(async () => {
  const [{ mountSuspended }, { defineComponent }] = await Promise.all([
    import('@nuxt/test-utils/runtime'),
    import('vue'),
  ])
  const wrapper = await mountSuspended(defineComponent({ render: () => null }), { route: false })
  wrapper.unmount()
})
