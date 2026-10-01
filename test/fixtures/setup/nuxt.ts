import { afterEach, beforeAll } from 'vitest'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'

/**
 * Setup for every `nuxt` project spec. Must run after the @nuxt/test-utils
 * entry, which calls `vi.resetModules()` and starts the app in its own
 * `beforeAll` — `withSetupFileAfterNuxt` in vitest.config.mts appends this
 * file behind it.
 */

/**
 * Unmount every wrapper after each test (@vue/test-utils
 * `enableAutoUnmount`, which `mountSuspended` inherits by wrapping `mount`).
 *
 * A component left mounted keeps its watchers and its `useApi` entry
 * alive: `clearNuxtData()` does not drop data a live instance still holds,
 * so the next test's mount read the previous test's payload — the
 * mechanism behind the order-dependent `Product/Suggestions` impression
 * test, and the reason several specs had started unmounting by hand.
 */
enableAutoUnmount(afterEach)

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
 * The runtime helpers are imported INSIDE the hook so they bind to the app
 * the test-utils hook just created rather than to a pre-reset module
 * instance.
 */
beforeAll(async () => {
  const [{ mountSuspended }, { defineComponent }] = await Promise.all([
    import('@nuxt/test-utils/runtime'),
    import('vue'),
  ])
  const wrapper = await mountSuspended(defineComponent({ render: () => null }), { route: false })
  wrapper.unmount()

  // Let the app's boot finish its deferred work here, not inside a test.
  // `plugins/setup.ts` defers the sessions, authenticators and
  // notifications loads to `requestIdleCallback`, which happy-dom lacks —
  // so its fallback `setTimeout(cb, 1)`, registered while the app booted.
  // A timer of the same delay registered now fires after it; the flush
  // then settles the calls it started. Otherwise a fast runner reached the
  // first tests before it fired, and a spec that resets its mocks per test
  // counted the boot's `getSessions` as its own (seen in CI: "reads the
  // sessions … once" got two calls).
  await new Promise(resolve => setTimeout(resolve, 1))
  await flushPromises()
})
