import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { COOKIE_ID_SEPARATOR } from '#cookie-control/types'
import CookieControl from '~/components/Cookie/Control.vue'

/**
 * The GDPR consent banner. It drives the app's REAL consent state
 * (`useCookieControl()` is the cookie plugin's `$cookies`), configured
 * by `cookieControl` in nuxt.config.ts: two necessary categories and six
 * optional ones. That state is app-wide, so it is reset around every
 * test, and the two consent cookies are expired again afterwards. The
 * button labels are the component's own `<i18n>` (el).
 */
const COPY = { accept: 'Αποδοχή', decline: 'Απόρριψη', settings: 'Ρυθμίσεις cookies' }
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

const mountBanner = () => mountSuspended(CookieControl, {
  route: false,
  global: { stubs: { CookieModal: { template: '<div data-test="modal" />' } } },
})

const button = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('button').find(b => b.text() === label)

/** The value the browser holds for `name`, as the plugin reads it back on the next visit. */
const cookie = (name: string) =>
  document.cookie.split('; ').find(pair => pair.startsWith(`${name}=`))?.slice(name.length + 1)

describe('Cookie/Control', () => {
  beforeEach(resetConsent)
  afterEach(resetConsent)

  it('asks a visitor who has not decided yet', async () => {
    const wrapper = await mountBanner()

    expect(wrapper.find('h2').exists()).toBe(true)
    expect([COPY.settings, COPY.accept, COPY.decline].map(label => button(wrapper, label)?.text()))
      .toEqual([COPY.settings, COPY.accept, COPY.decline])
  })

  it('enables every category on accept, remembers it, and goes away', async () => {
    const wrapper = await mountBanner()

    await button(wrapper, COPY.accept)!.trigger('click')
    await flushPromises()

    expect(state().isConsentGiven.value).toBe(true)
    expect(state().cookiesEnabledIds.value).toEqual([...NECESSARY, ...OPTIONAL])
    // What the next visit reads back.
    expect(decodeURIComponent(cookie(state().moduleOptions.cookieNameCookiesEnabledIds) ?? ''))
      .toBe([...NECESSARY, ...OPTIONAL].join(COOKIE_ID_SEPARATOR))
    expect(button(wrapper, COPY.accept)).toBeUndefined()
  })

  it('keeps only the necessary categories on decline — a decision, so the banner goes', async () => {
    const wrapper = await mountBanner()

    await button(wrapper, COPY.decline)!.trigger('click')
    await flushPromises()

    expect(state().isConsentGiven.value).toBe(true)
    expect(state().cookiesEnabledIds.value).toEqual(NECESSARY)
    expect(button(wrapper, COPY.decline)).toBeUndefined()
  })

  it('opens the settings modal from the banner', async () => {
    const wrapper = await mountBanner()

    await button(wrapper, COPY.settings)!.trigger('click')

    expect(state().isModalActive.value).toBe(true)
    await vi.waitFor(() => expect(wrapper.find('[data-test="modal"]').exists()).toBe(true))
  })

  it('does not ask again once the visitor has decided', async () => {
    state().isConsentGiven.value = true

    const wrapper = await mountBanner()

    expect(button(wrapper, COPY.accept)).toBeUndefined()
  })
})
