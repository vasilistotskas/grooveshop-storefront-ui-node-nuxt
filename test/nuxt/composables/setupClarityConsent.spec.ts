/**
 * setupClarityConsent (app/composables/setups.ts): tenant-only, loaded behind
 * analytics consent, told each decision through Clarity's consent API.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { effectScope } from 'vue'
import type { EffectScope } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setTenant } from '~~/test/helpers/tenant'

const { clarity, scriptClarityMock, triggerConsentMock, consent } = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  const clarity = vi.fn()
  return {
    clarity,
    scriptClarityMock: vi.fn(() => ({ proxy: { clarity } })),
    triggerConsentMock: vi.fn(() => 'consent-trigger'),
    consent: { given: ref(false), enabled: ref<string[]>([]) },
  }
})
mockNuxtImport('useScriptClarity', () => scriptClarityMock)
mockNuxtImport('useScriptTriggerConsent', () => triggerConsentMock)
mockNuxtImport('useCookieControl', () => () => ({
  isConsentGiven: consent.given,
  cookiesEnabledIds: consent.enabled,
}))
mockNuxtImport('afterNextPaint', () => () => Promise.resolve())

const { setupClarityConsent: setup } = await import('~/composables/setups')

// In a scope of its own, as in a component: a watcher left running by one
// test would call Clarity during the next.
let scope: EffectScope
const setupClarityConsent = () => scope.run(setup)

const answer = async (...categories: string[]) => {
  consent.given.value = true
  consent.enabled.value = categories
  await flushPromises()
}

const triggerGate = () => {
  const options = triggerConsentMock.mock.calls[0] as unknown as [{ consent: { value: boolean } }]
  return options[0].consent
}

afterEach(() => scope.stop())

beforeEach(() => {
  scope = effectScope()
  consent.given.value = false
  consent.enabled.value = []
  setTenant({ clarityProjectId: 'z8z79wsqeu' })
})

describe('setupClarityConsent', () => {
  it('does nothing for a store with no Clarity project', async () => {
    setTenant({ clarityProjectId: '' })

    setupClarityConsent()
    await answer('analytics_storage')

    expect(scriptClarityMock).not.toHaveBeenCalled()
    expect(clarity).not.toHaveBeenCalled()
  })

  it('registers the store\'s own project behind the consent trigger', () => {
    setupClarityConsent()

    expect(scriptClarityMock).toHaveBeenCalledWith({
      id: 'z8z79wsqeu',
      // bundle:false is load-bearing: bundling would fetch the vendor script
      // into the shared image at build time.
      scriptOptions: { trigger: 'consent-trigger', bundle: false },
    })
  })

  it('loads only once the visitor answers the banner and allows analytics', async () => {
    consent.enabled.value = ['analytics_storage']

    setupClarityConsent()
    await flushPromises()

    expect(triggerGate().value).toBe(false)
    expect(clarity).not.toHaveBeenCalled()

    await answer('ad_storage')
    expect(triggerGate().value).toBe(false)
    expect(clarity).not.toHaveBeenCalled()

    await answer('analytics_storage')
    expect(triggerGate().value).toBe(true)
  })

  it('sends a returning visitor\'s decision as soon as it is set up', async () => {
    consent.given.value = true
    consent.enabled.value = ['analytics_storage', 'ad_storage']

    setupClarityConsent()
    await flushPromises()

    expect(clarity).toHaveBeenCalledExactlyOnceWith('consentv2', {
      ad_Storage: 'granted',
      analytics_Storage: 'granted',
    })
  })

  it('tells Clarity when ads are refused and analytics allowed', async () => {
    setupClarityConsent()

    await answer('analytics_storage')

    expect(clarity).toHaveBeenCalledExactlyOnceWith('consentv2', {
      ad_Storage: 'denied',
      analytics_Storage: 'granted',
    })
  })

  it('erases Clarity\'s cookies and stops it when analytics consent is withdrawn', async () => {
    setupClarityConsent()
    await answer('analytics_storage')
    clarity.mockClear()

    await answer()

    expect(clarity).toHaveBeenCalledExactlyOnceWith('consent', false)
  })

  it('sends nothing to a visitor who refused from the start', async () => {
    setupClarityConsent()

    await answer('ad_storage')

    expect(clarity).not.toHaveBeenCalled()
  })

  it('takes consent again after it was withdrawn', async () => {
    setupClarityConsent()
    await answer('analytics_storage')
    await answer()
    clarity.mockClear()

    await answer('analytics_storage')

    expect(clarity).toHaveBeenCalledExactlyOnceWith('consentv2', {
      ad_Storage: 'denied',
      analytics_Storage: 'granted',
    })
  })
})
