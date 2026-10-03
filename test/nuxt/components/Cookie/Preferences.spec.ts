import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CookiePreferences from '~/components/Cookie/Preferences.vue'

/**
 * The platform's cookie preferences: one switch per group, the
 * necessary groups on and locked. Switching changes only the working
 * choice; "Save choices" and "Reject optional" decide.
 *
 * It drives the app's REAL consent state, configured by `cookieControl`
 * in nuxt.config.ts (two necessary categories, six optional). `UModal`
 * teleports its content to `document.body`, outside the wrapper.
 */
const NECESSARY = ['n', 'functionality_storage']

const state = () => useCookieControl()

function resetConsent() {
  const { isConsentGiven, cookiesEnabled, cookiesEnabledIds, isModalActive } = state()
  isConsentGiven.value = false
  cookiesEnabled.value = []
  cookiesEnabledIds.value = []
  isModalActive.value = false
}

/** A decision already on record — the preferences re-opened from the footer. */
function consentGiven(enabled: string[]) {
  const { isConsentGiven, cookiesEnabled, cookiesEnabledIds, moduleOptions } = state()
  isConsentGiven.value = true
  cookiesEnabled.value = [...moduleOptions.cookies.necessary, ...moduleOptions.cookies.optional].filter(cookie => enabled.includes(cookie.id))
  cookiesEnabledIds.value = [...enabled]
}

async function open() {
  state().isModalActive.value = true
  const wrapper = await mountSuspended(CookiePreferences, { route: false })
  await flushPromises()
  return wrapper
}

const own = (wrapper: VueWrapper, key: string) =>
  (wrapper.vm as unknown as { t: (k: string) => string }).t(key)

/** A group's switch, through its `<label for>`. */
function groupSwitch(wrapper: VueWrapper, group: string): HTMLButtonElement {
  const name = own(wrapper, `groups.${group}.label`)
  const label = [...document.querySelectorAll('[role="dialog"] label')].find(node => node.textContent?.trim() === name)
  const control = label && document.getElementById(label.getAttribute('for') ?? '')
  if (!control) throw new Error(`no switch labelled ${JSON.stringify(name)}`)
  return control as HTMLButtonElement
}

const isOn = (wrapper: VueWrapper, group: string) => groupSwitch(wrapper, group).getAttribute('aria-checked') === 'true'

function footerButton(wrapper: VueWrapper, key: string) {
  const button = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
    .find(node => node.textContent?.trim() === own(wrapper, key))
  if (!button) throw new Error(`no ${key} button`)
  return button
}

describe('Cookie/Preferences', () => {
  beforeEach(resetConsent)
  afterEach(resetConsent)

  it('opens on a first visit with the necessary groups on and locked, every optional group off', async () => {
    const wrapper = await open()

    expect(['necessary', 'functionality', 'analytics', 'advertising', 'personalization', 'security'].map(group => [group, isOn(wrapper, group), groupSwitch(wrapper, group).disabled]))
      .toEqual([
        ['necessary', true, true],
        ['functionality', true, true],
        ['analytics', false, false],
        ['advertising', false, false],
        ['personalization', false, false],
        ['security', false, false],
      ])
  })

  it('shows a group on when the decision on record holds all of its categories', async () => {
    consentGiven([...NECESSARY, 'analytics_storage', 'ad_storage'])

    const wrapper = await open()

    expect(isOn(wrapper, 'analytics')).toBe(true)
    // Advertising is three categories; one of them is not a yes.
    expect(isOn(wrapper, 'advertising')).toBe(false)
  })

  it('decides nothing while switching, and saves every category of the groups switched on', async () => {
    const wrapper = await open()

    groupSwitch(wrapper, 'advertising').click()
    groupSwitch(wrapper, 'analytics').click()
    await flushPromises()
    expect(state().isConsentGiven.value).toBe(false)

    footerButton(wrapper, 'save').click()
    await flushPromises()

    expect(state().isConsentGiven.value).toBe(true)
    expect([...state().cookiesEnabledIds.value!].sort())
      .toEqual([...NECESSARY, 'ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage'].sort())
    expect(state().isModalActive.value).toBe(false)
  })

  it('keeps only the necessary categories on "reject optional", whatever was switched', async () => {
    consentGiven([...NECESSARY, 'analytics_storage'])
    const wrapper = await open()
    groupSwitch(wrapper, 'personalization').click()
    await flushPromises()

    footerButton(wrapper, 'reject_optional').click()
    await flushPromises()

    expect(state().cookiesEnabledIds.value).toEqual(NECESSARY)
    expect(state().isModalActive.value).toBe(false)
  })
})
