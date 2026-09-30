import { vi } from 'vitest'
import type { Mock } from 'vitest'
import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

export type AsyncDataStatus = 'idle' | 'pending' | 'success' | 'error'

/** The fields of Nuxt 4's `_AsyncData` (nuxt `app/composables/asyncData`), plus `reset`. */
export interface AsyncDataState<T, E = unknown> {
  data: Ref<T | undefined>
  status: Ref<AsyncDataStatus>
  error: Ref<E | undefined>
  /** `status === 'pending'`, derived like Nuxt 4 does — set `status`, not this. */
  pending: ComputedRef<boolean>
  refresh: Mock<(opts?: unknown) => Promise<void>>
  /** The same mock as `refresh` — Nuxt documents `execute` as its alias. */
  execute: Mock<(opts?: unknown) => Promise<void>>
  /** Like Nuxt's: `data` and `error` to `undefined`, `status` to `'idle'`. */
  clear: Mock<() => void>
  /** Back to the state the mock was created with — call it in `beforeEach`. */
  reset: () => void
}

/** Awaitable like the real return value: `await useApi(...)` resolves to the same refs. */
export type AsyncDataMock<T, E = unknown> = AsyncDataState<T, E> & Promise<AsyncDataState<T, E>>

/**
 * The return value of `useAsyncData` / `useApi` / `useLazyApi` (and of
 * composables that hand one back, e.g. `useLoyalty().fetchSummary()`),
 * for specs that mock them instead of answering the request.
 *
 * Shaped like Nuxt 4's `AsyncData`: `data` and `error` start `undefined`
 * (not `null` — that was Nuxt 3), `status` is `'success'` when an
 * `initial` value is given and `'idle'` otherwise. The object is also a
 * promise resolving to the same refs, so a component that awaits the
 * call in `<script setup>` and one that does not both work.
 *
 * The refs are plain module state — the project's `mockReset` resets the
 * `vi.fn`s but not them — so call `reset()` in `beforeEach`. `reset()`
 * installs a fresh `structuredClone` of `initial`, so a test that mutated
 * nested data cannot leak it into the next one.
 *
 * ```ts
 * const summary = createAsyncDataMock<LoyaltySummary>()
 * mockNuxtImport('useLoyalty', () => () => ({ fetchSummary: () => summary }))
 * beforeEach(() => summary.reset())
 * it('shows the error state', async () => {
 *   summary.status.value = 'error'
 *   summary.error.value = new Error('boom')
 *   ...
 * })
 * ```
 *
 * Module scope is fine when the `mockNuxtImport` factory only references
 * the mock inside the function it returns (as above). If the factory
 * needs it directly, create it through
 * `await vi.hoisted(async () => (await import('~~/test/helpers/asyncData')).createAsyncDataMock())`.
 */
export function createAsyncDataMock<T, E = unknown>(initial?: T): AsyncDataMock<T, E> {
  const fresh = () => (initial === undefined ? undefined : structuredClone(initial))

  const data = ref(fresh()) as Ref<T | undefined>
  const status = ref<AsyncDataStatus>(initial === undefined ? 'idle' : 'success')
  const error = ref<E | undefined>(undefined) as Ref<E | undefined>
  const pending = computed(() => status.value === 'pending')
  const refresh = vi.fn((_opts?: unknown) => Promise.resolve())
  const clear = vi.fn(() => {
    data.value = undefined
    error.value = undefined
    status.value = 'idle'
  })

  const state: AsyncDataState<T, E> = {
    data,
    status,
    error,
    pending,
    refresh,
    execute: refresh,
    clear,
    reset: () => {
      data.value = fresh()
      error.value = undefined
      status.value = initial === undefined ? 'idle' : 'success'
    },
  }

  // Resolve to the plain state object, never to the thenable itself —
  // resolving a promise with a thenable would unwrap it forever.
  return Object.assign(Promise.resolve(state), state)
}
