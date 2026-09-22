import { describe, it, expect } from 'vitest'
import { payloadCachedData } from '~/utils/payloadCachedData'

/**
 * The one difference from Nuxt's default `getCachedData`: the payload
 * is honoured on the INITIAL read even when the app is no longer
 * hydrating, which is when a `hydrate-on-visible` component runs its
 * setup. Everything else mirrors the default, so a fetch that opts in
 * behaves like every other fetch on refresh.
 */
const nuxtApp = (overrides: { isHydrating?: boolean, payload?: unknown, static?: unknown }) => ({
  isHydrating: overrides.isHydrating ?? false,
  payload: { data: { key: overrides.payload } },
  static: { data: { key: overrides.static } },
}) as unknown as Parameters<typeof payloadCachedData>[1]

describe('payloadCachedData', () => {
  it('returns the server payload while the app hydrates', () => {
    expect(payloadCachedData('key', nuxtApp({ isHydrating: true, payload: 'ssr' }), { cause: 'initial' }))
      .toBe('ssr')
  })

  it('returns the server payload on the initial read of a lazily hydrated component', () => {
    // isHydrating is false by the time a hydrate-on-visible subtree
    // mounts; the default would return nothing here and refetch.
    expect(payloadCachedData('key', nuxtApp({ isHydrating: false, payload: 'ssr' }), { cause: 'initial' }))
      .toBe('ssr')
  })

  it('falls through to the static data when the payload has nothing', () => {
    expect(payloadCachedData('key', nuxtApp({ static: 'static' }), { cause: 'initial' }))
      .toBe('static')
    expect(payloadCachedData('key', nuxtApp({ static: 'static' }), { cause: 'watch' }))
      .toBe('static')
  })

  it('never short-circuits a manual or hook refresh', () => {
    expect(payloadCachedData('key', nuxtApp({ payload: 'ssr', static: 'static' }), { cause: 'refresh:manual' }))
      .toBeUndefined()
    expect(payloadCachedData('key', nuxtApp({ payload: 'ssr', static: 'static' }), { cause: 'refresh:hook' }))
      .toBeUndefined()
  })
})
