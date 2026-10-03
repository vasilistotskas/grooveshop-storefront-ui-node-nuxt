import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { COOKIE_ID_SEPARATOR } from '#cookie-control/types'
import CookieConsent from '~/components/Chrome/CookieConsent.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The platform's cookie banner. It drives the app's REAL consent state
 * (`useCookieControl()` is the cookie plugin's `$cookies`), configured
 * by `cookieControl` in nuxt.config.ts: two necessary categories and six
 * optional ones. That state is app-wide, so it is reset around every
 * test, and the two consent cookies are expired again afterwards.
 */
const NECESSARY = ['n', 'functionality_storage']
const OPTIONAL = ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage', 'personalization_storage', 'security_storage']

const state = () => useCookieControl()

function resetConsent() {
  const { isConsentGiven, cookiesEnabled, cookiesEnabledIds, isModalActive, moduleOptions } = state()
  isConsentGiven.value = false
  cookiesEnabled.value = []
  cookiesEnabledIds.value = []
  isModalActive.value = false
  for (const name of [moduleOptions.cookieNameIsConsentGiven, moduleOptions.cookieNameCookiesEnabledIds])
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

/** `<LazyCookiePreferences>` compiles to a direct async import no stub key matches, so its module is mocked. */
vi.mock('~/components/Cookie/Preferences.vue', () => ({ default: { template: '<div data-test="preferences" />' } }))

const mountBanner = () => mountSuspended(CookieConsent, { route: false })

const own = (wrapper: VueWrapper, key: string, params: Record<string, unknown> = {}) =>
  (wrapper.vm as unknown as { t: (k: string, p: Record<string, unknown>) => string }).t(key, params)

const button = (wrapper: VueWrapper, key: string) =>
  wrapper.findAll('button').find(b => b.text() === own(wrapper, key))

/** The value the browser holds for `name`, as the plugin reads it back on the next visit. */
const cookie = (name: string) =>
  document.cookie.split('; ').find(pair => pair.startsWith(`${name}=`))?.slice(name.length + 1)

describe('Chrome/CookieConsent', () => {
  beforeEach(() => {
    resetConsent()
    setTenant({ gaTrackingId: '', googleAdsConversionId: '', metaPixelId: '', tiktokPixelId: '' })
  })
  afterEach(resetConsent)

  it('asks a visitor who has not decided yet, with both answers and a way into the choices', async () => {
    const wrapper = await mountBanner()

    expect(wrapper.find('section h2').text()).toBe(own(wrapper, 'title'))
    expect(['necessary_only', 'accept_all', 'customise'].map(key => button(wrapper, key)?.exists())).toEqual([true, true, true])
    expect(wrapper.find('a').attributes('href')).toBe('/cookies-policy')
  })

  it('names only the services this store has switched on', async () => {
    setTenant({ gaTrackingId: 'G-1', googleAdsConversionId: '', metaPixelId: '', tiktokPixelId: 'T-1' })
    const withServices = await mountBanner()
    expect(withServices.find('p').text()).toContain(own(withServices, 'body_services', { services: 'Google, TikTok' }))
    withServices.unmount()

    setTenant({ gaTrackingId: '', googleAdsConversionId: '', metaPixelId: '', tiktokPixelId: '' })
    const without = await mountBanner()
    expect(without.find('p').text()).toContain(own(without, 'body'))
  })

  it('enables every category on "accept all", remembers it, and goes away', async () => {
    const wrapper = await mountBanner()

    await button(wrapper, 'accept_all')!.trigger('click')
    await flushPromises()

    expect(state().isConsentGiven.value).toBe(true)
    expect(state().cookiesEnabledIds.value).toEqual([...NECESSARY, ...OPTIONAL])
    // What the next visit reads back.
    expect(decodeURIComponent(cookie(state().moduleOptions.cookieNameCookiesEnabledIds) ?? ''))
      .toBe([...NECESSARY, ...OPTIONAL].join(COOKIE_ID_SEPARATOR))
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('keeps only the necessary categories on "necessary only" — a decision, so the banner goes', async () => {
    const wrapper = await mountBanner()

    await button(wrapper, 'necessary_only')!.trigger('click')
    await flushPromises()

    expect(state().isConsentGiven.value).toBe(true)
    expect(state().cookiesEnabledIds.value).toEqual(NECESSARY)
    expect(decodeURIComponent(cookie(state().moduleOptions.cookieNameCookiesEnabledIds) ?? ''))
      .toBe(NECESSARY.join(COOKIE_ID_SEPARATOR))
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('opens the preferences in place of the banner', async () => {
    const wrapper = await mountBanner()

    await button(wrapper, 'customise')!.trigger('click')

    expect(state().isModalActive.value).toBe(true)
    await vi.waitFor(() => expect(wrapper.find('[data-test="preferences"]').exists()).toBe(true))
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('does not ask again once the visitor has decided', async () => {
    state().isConsentGiven.value = true

    const wrapper = await mountBanner()

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
