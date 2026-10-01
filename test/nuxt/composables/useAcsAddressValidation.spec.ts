import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'

/**
 * The checkout's "did you mean…" lookup: one POST per pause in typing
 * (600 ms debounce), the newest request the only one allowed to answer,
 * and every failure silent — a rural address ACS cannot geocode must not
 * read as an error.
 */

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const URL = '/api/shipping/acs/address-validation'
const ADDRESS = 'Ermou 10 10563 Athens'

function resolvedAddress(overrides: Record<string, unknown> = {}) {
  return {
    geoId: 1,
    resolvedStreet: 'ΕΡΜΟΥ',
    resolvedStreetNum: '10',
    resolvedZip: '10563',
    resolvedArea: 'ΑΘΗΝΑ',
    resolvedStationId: 'ATH',
    resolvedProvidence: 'ΑΤΤΙΚΗ',
    addressId: 'A1',
    ...overrides,
  }
}

/** A request that stays in flight until the test settles it. */
function deferred() {
  let resolve!: (value: unknown) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAcsAddressValidation', () => {
  describe('debounce', () => {
    it('posts the trimmed address once the shopper pauses for 600 ms', async () => {
      const { validate } = useAcsAddressValidation()

      validate(`  ${ADDRESS}  `)
      await vi.advanceTimersByTimeAsync(599)
      expect(api.callsTo(URL)).toEqual([])

      await vi.advanceTimersByTimeAsync(1)
      expect(api.callsTo(URL)).toEqual([{
        url: URL,
        options: expect.objectContaining({ method: 'POST', body: { address: ADDRESS }, signal: expect.any(AbortSignal) }),
      }])
    })

    it('restarts the wait on every keystroke and sends only the last value', async () => {
      const { validate } = useAcsAddressValidation()

      validate('Ermou 1')
      await vi.advanceTimersByTimeAsync(400)
      validate('Ermou 10')
      await vi.advanceTimersByTimeAsync(400)
      expect(api.callsTo(URL)).toEqual([])

      await vi.advanceTimersByTimeAsync(200)
      expect(api.callsTo(URL).map(call => call.options.body)).toEqual([{ address: 'Ermou 10' }])
    })

    it('honours a caller-supplied debounce', async () => {
      const { validate } = useAcsAddressValidation()

      validate(ADDRESS, { debounceMs: 100 })
      await vi.advanceTimersByTimeAsync(100)

      expect(api.callsTo(URL)).toHaveLength(1)
    })

    it('asks nothing for fewer than 5 characters and clears the previous suggestion', async () => {
      api.routes({ [URL]: resolvedAddress() })
      const { validate, resolved, isLoading } = useAcsAddressValidation()
      validate(ADDRESS)
      await vi.advanceTimersByTimeAsync(600)
      expect(resolved.value).not.toBeNull()

      validate(' Erm  ')
      await vi.advanceTimersByTimeAsync(600)

      expect(api.callsTo(URL)).toHaveLength(1)
      expect(resolved.value).toBeNull()
      expect(isLoading.value).toBe(false)
    })

    it.each([
      ['sends', 'Ermou', 1],
      ['does not send', 'Ermo', 0],
    ])('%s a trimmed address of exactly %j', async (_verb, address, requests) => {
      const { validate } = useAcsAddressValidation()

      validate(`  ${address}  `)
      await vi.advanceTimersByTimeAsync(600)

      expect(api.callsTo(URL)).toHaveLength(requests)
    })

    it('cancel() drops a pending lookup before it is sent', async () => {
      const { validate, cancel } = useAcsAddressValidation()

      validate(ADDRESS)
      await vi.advanceTimersByTimeAsync(300)
      cancel()
      await vi.advanceTimersByTimeAsync(600)

      expect(api.callsTo(URL)).toEqual([])
    })
  })

  describe('answers', () => {
    it('is loading while the request is in flight, then exposes the resolution', async () => {
      const request = deferred()
      api.routes({ [URL]: () => request.promise })
      const { validate, resolved, isLoading } = useAcsAddressValidation()

      validate(ADDRESS)
      await vi.advanceTimersByTimeAsync(600)
      expect(isLoading.value).toBe(true)

      request.resolve(resolvedAddress())
      await flushPromises()

      expect(isLoading.value).toBe(false)
      expect(resolved.value).toEqual(resolvedAddress())
    })

    it.each([
      ['an empty body', null],
      ['a payload with no postcode (ACS could not geocode)', resolvedAddress({ resolvedZip: '' })],
    ])('collapses %s to no suggestion', async (_case, body) => {
      api.routes({ [URL]: body })
      const { validate, resolved, errorMessage } = useAcsAddressValidation()

      validate(ADDRESS)
      await vi.advanceTimersByTimeAsync(600)

      expect(resolved.value).toBeNull()
      expect(errorMessage.value).toBeNull()
    })

    it('swallows a failure: no suggestion, the status message kept for diagnostics', async () => {
      api.routes({
        [URL]: () => { throw Object.assign(new Error('503'), { statusMessage: 'ACS is not configured' }) },
      })
      const { validate, resolved, isLoading, errorMessage } = useAcsAddressValidation()

      validate(ADDRESS)
      await vi.advanceTimersByTimeAsync(600)

      expect(resolved.value).toBeNull()
      expect(isLoading.value).toBe(false)
      expect(errorMessage.value).toBe('ACS is not configured')
    })
  })

  describe('only the newest request answers', () => {
    it('aborts the in-flight request when a newer one starts, and ignores its late answer', async () => {
      const older = deferred()
      const newer = deferred()
      const inFlight = [older, newer]
      api.routes({ [URL]: () => inFlight.shift()!.promise })
      const { validate, resolved, isLoading } = useAcsAddressValidation()

      validate('Ermou 1 Athens')
      await vi.advanceTimersByTimeAsync(600)
      validate(ADDRESS)
      await vi.advanceTimersByTimeAsync(600)

      const [first, second] = api.callsTo(URL)
      expect(first!.options.signal.aborted).toBe(true)
      expect(second!.options.signal.aborted).toBe(false)

      newer.resolve(resolvedAddress({ resolvedStreetNum: '10' }))
      await flushPromises()
      older.resolve(resolvedAddress({ resolvedStreetNum: '1' }))
      await flushPromises()

      expect(resolved.value?.resolvedStreetNum).toBe('10')
      expect(isLoading.value).toBe(false)
    })

    it('stays loading when the superseded request settles while the newer one is still in flight', async () => {
      const older = deferred()
      const newer = deferred()
      const inFlight = [older, newer]
      api.routes({ [URL]: () => inFlight.shift()!.promise })
      const { validate, isLoading } = useAcsAddressValidation()

      validate('Ermou 1 Athens')
      await vi.advanceTimersByTimeAsync(600)
      validate(ADDRESS)
      await vi.advanceTimersByTimeAsync(600)

      older.reject(abortError())
      await flushPromises()
      expect(isLoading.value).toBe(true)

      newer.resolve(resolvedAddress())
      await flushPromises()
      expect(isLoading.value).toBe(false)
    })

    it('an aborted request that rejects with AbortError leaves the newer state alone', async () => {
      const older = deferred()
      const inFlight = [older.promise, Promise.resolve(resolvedAddress())]
      api.routes({ [URL]: () => inFlight.shift() })
      const { validate, resolved, errorMessage } = useAcsAddressValidation()

      validate('Ermou 1 Athens')
      await vi.advanceTimersByTimeAsync(600)
      validate(ADDRESS)
      await vi.advanceTimersByTimeAsync(600)
      older.reject(abortError())
      await flushPromises()

      expect(resolved.value).toEqual(resolvedAddress())
      expect(errorMessage.value).toBeNull()
    })

    it('cancel() aborts the in-flight request and its answer never lands', async () => {
      const request = deferred()
      api.routes({ [URL]: () => request.promise })
      const { validate, cancel, resolved } = useAcsAddressValidation()

      validate(ADDRESS)
      await vi.advanceTimersByTimeAsync(600)
      cancel()
      request.resolve(resolvedAddress())
      await flushPromises()

      expect(api.callsTo(URL)[0]!.options.signal.aborted).toBe(true)
      expect(resolved.value).toBeNull()
    })

    // The suggestion is switched off (the shopper picked a country ACS
    // does not serve, say) while a lookup is in flight: nothing may stay
    // "checking", and no earlier answer may stay on offer.
    it('cancel() mid-request stops the loading state and drops the earlier answer', async () => {
      const request = deferred()
      const answers = [Promise.resolve(resolvedAddress()), request.promise]
      api.routes({ [URL]: () => answers.shift() })
      const { validate, cancel, resolved, isLoading } = useAcsAddressValidation()
      validate(ADDRESS)
      await vi.advanceTimersByTimeAsync(600)
      await flushPromises()
      expect(resolved.value).toEqual(resolvedAddress())

      validate('Ermou 2 Athens 10563')
      await vi.advanceTimersByTimeAsync(600)
      expect(isLoading.value).toBe(true)
      cancel()

      expect(isLoading.value).toBe(false)
      expect(resolved.value).toBeNull()
    })

    it('offers no earlier answer for an address that has since changed', async () => {
      api.routes({ [URL]: () => resolvedAddress() })
      const { validate, resolved } = useAcsAddressValidation()
      validate(ADDRESS)
      await vi.advanceTimersByTimeAsync(600)
      await flushPromises()
      expect(resolved.value).toEqual(resolvedAddress())

      validate('Ermou 2 Athens 10563')

      expect(resolved.value).toBeNull()
    })
  })
})
