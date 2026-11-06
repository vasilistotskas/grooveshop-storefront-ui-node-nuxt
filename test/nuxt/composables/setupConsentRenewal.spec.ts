/**
 * setupConsentRenewal (app/composables/setups.ts): a consent covers the
 * services it was given for, so a store that adds one asks again.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { effectScope, nextTick } from 'vue'
import type { EffectScope } from 'vue'
import { setupConsentRenewal } from '~/composables/setups'
import { useCookieControl } from '~/composables/useCookieControl'
import { setTenant } from '~~/test/helpers/tenant'

const NONE = { gaTrackingId: '', googleAdsConversionId: '', metaPixelId: '', tiktokPixelId: '', openaiPixelId: '', clarityProjectId: '' }

let scope: EffectScope

const cookieValue = (name: string) => {
  const pair = document.cookie.split('; ').find(item => item.startsWith(`${name}=`))
  return pair === undefined ? undefined : decodeURIComponent(pair.slice(name.length + 1))
}
const expire = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

/** A visitor who answered, for these services, before this page loaded. */
function answered(services: string | undefined) {
  const { isConsentGiven, cookiesEnabled, cookiesEnabledIds, moduleOptions } = useCookieControl()
  isConsentGiven.value = true
  cookiesEnabled.value = [...moduleOptions.cookies.necessary, ...moduleOptions.cookies.optional]
  cookiesEnabledIds.value = cookiesEnabled.value.map(cookie => cookie.id)
  const name = moduleOptions.cookieNameConsentServices
  if (services === undefined) expire(name)
  else document.cookie = `${name}=${encodeURIComponent(services)}; path=/`
}

const run = () => scope.run(setupConsentRenewal)

beforeEach(() => {
  scope = effectScope()
  expire(useCookieControl().moduleOptions.cookieNameConsentServices)
})

afterEach(() => scope.stop())

describe('setupConsentRenewal', () => {
  it('asks again when the store added a service since the answer', () => {
    setTenant({ ...NONE, gaTrackingId: 'G-1', clarityProjectId: 'c' })
    answered('Google Analytics')

    run()

    const { isConsentGiven, cookiesEnabledIds } = useCookieControl()
    expect(isConsentGiven.value).toBe(false)
    expect(cookiesEnabledIds.value).toEqual([])
  })

  it('asks again when a store with Google Analytics adds Google Ads', () => {
    setTenant({ ...NONE, gaTrackingId: 'G-1', googleAdsConversionId: 'AW-1' })
    answered('Google Analytics')

    run()

    expect(useCookieControl().isConsentGiven.value).toBe(false)
  })

  it('asks a visitor whose decision has no record of its services', () => {
    setTenant({ ...NONE, gaTrackingId: 'G-1' })
    answered(undefined)

    run()

    expect(useCookieControl().isConsentGiven.value).toBe(false)
  })

  it('keeps a consent that covers every service', () => {
    setTenant({ ...NONE, gaTrackingId: 'G-1', clarityProjectId: 'c' })
    answered('Google Analytics~Microsoft Clarity')

    run()

    const { isConsentGiven, cookiesEnabledIds } = useCookieControl()
    expect(isConsentGiven.value).toBe(true)
    expect(cookiesEnabledIds.value).toContain('analytics_storage')
  })

  it('asks nobody when the store removed a service', () => {
    setTenant({ ...NONE, gaTrackingId: 'G-1' })
    answered('Google Analytics~Meta')

    run()

    expect(useCookieControl().isConsentGiven.value).toBe(true)
  })

  it('leaves a store with no optional service alone', () => {
    setTenant(NONE)
    answered(undefined)

    run()

    expect(useCookieControl().isConsentGiven.value).toBe(true)
  })

  it('records what an answer was given for', async () => {
    setTenant({ ...NONE, gaTrackingId: 'G-1', clarityProjectId: 'c' })
    const { isConsentGiven, moduleOptions } = useCookieControl()
    isConsentGiven.value = false

    run()
    isConsentGiven.value = true
    await nextTick()
    await nextTick()

    expect(cookieValue(moduleOptions.cookieNameConsentServices)).toBe('Google Analytics~Microsoft Clarity')
  })
})
