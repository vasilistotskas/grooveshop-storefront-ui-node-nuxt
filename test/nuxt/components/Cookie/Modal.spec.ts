import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { Cookie } from '#cookie-control/types'
import CookieModal from '~/components/Cookie/Modal.vue'

/**
 * The cookie preferences modal ("Προσαρμογή"): one switch per category,
 * then decline all / accept all / save the selection.
 *
 * It drives the app's REAL consent state (`useCookieControl()` is the
 * cookie plugin's `$cookies`), configured by `cookieControl` in
 * nuxt.config.ts: two necessary categories and six optional ones. The
 * modal only decides; persisting the decision to the consent cookies is
 * `Cookie/Control`'s watcher (`test/nuxt/components/Cookie/Control.spec.ts`).
 * The state is app-wide, so it is reset around every test.
 *
 * `UModal` teleports its content to `document.body`, outside the
 * wrapper. The button labels are the component's own `<i18n>` (el).
 */
const COPY = {
  declineAll: 'Απόρριψη όλων',
  acceptAll: 'Αποδοχή όλων',
  save: 'Αποθήκευση',
  unsaved: 'Έχεις μη αποθηκευμένες αλλαγές',
}
const NECESSARY = ['n', 'functionality_storage']
const OPTIONAL = ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage', 'personalization_storage', 'security_storage']

const state = () => useCookieControl()
const t = (key: string) => useNuxtApp().$i18n.t(key)
const ids = (cookies: Cookie[] | undefined) => (cookies ?? []).map(cookie => cookie.id)

/** A consent already given for `enabled` — the modal re-opened from the footer. */
function consentGiven(enabled: string[]) {
  const { isConsentGiven, cookiesEnabled, cookiesEnabledIds, moduleOptions } = state()
  const all = [...moduleOptions.cookies.necessary, ...moduleOptions.cookies.optional]
  isConsentGiven.value = true
  cookiesEnabled.value = all.filter(cookie => enabled.includes(cookie.id))
  cookiesEnabledIds.value = [...enabled]
}

function resetConsent() {
  const { isConsentGiven, cookiesEnabled, cookiesEnabledIds, isModalActive } = state()
  isConsentGiven.value = false
  cookiesEnabled.value = []
  cookiesEnabledIds.value = []
  isModalActive.value = false
}

async function openModal() {
  state().isModalActive.value = true
  const wrapper = await mountSuspended(CookieModal, { route: false })
  await flushPromises()
  return wrapper
}

const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')
/** UModal's own close button (its `close` slot). */
const closeButton = () => document.querySelector<HTMLElement>('[role="dialog"] [data-slot="close"]')

const button = (label: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
    .find(node => node.textContent?.trim() === label)

/** The category's switch, found through its `<label for>`. */
function categorySwitch(nameKey: string): HTMLButtonElement {
  const label = [...document.querySelectorAll('[role="dialog"] label')]
    .find(node => node.textContent?.trim() === t(nameKey))
  const control = label && document.getElementById(label.getAttribute('for') ?? '')
  if (!control) throw new Error(`no switch labelled ${JSON.stringify(t(nameKey))}`)
  return control as HTMLButtonElement
}

const isOn = (nameKey: string) => categorySwitch(nameKey).getAttribute('aria-checked') === 'true'

async function click(element: HTMLElement | undefined) {
  if (!element) throw new Error('nothing to click')
  element.click()
  await flushPromises()
}

describe('Cookie/Modal', () => {
  beforeEach(resetConsent)
  afterEach(resetConsent)

  describe('the categories', () => {
    it('lists every configured category under its heading, necessary first', async () => {
      await openModal()

      const headings = [...dialog()!.querySelectorAll('h3')].map(node => node.textContent?.trim())
      expect(headings).toEqual([t('cookies.necessary'), t('cookies.optional')])
      const labels = [...dialog()!.querySelectorAll('label')].map(node => node.textContent?.trim())
      expect(labels).toEqual([...NECESSARY, ...OPTIONAL].map(id =>
        t(id === 'n' ? 'cookies.necessary' : `cookies.${id}`)))
    })

    it('shows the cookie ids a necessary category covers', async () => {
      await openModal()

      expect(dialog()!.textContent).toContain('IDs: "i18n_redirected", "ncc_c", "ncc_e"')
    })

    it('starts from the consent already given', async () => {
      consentGiven([...NECESSARY, 'analytics_storage'])

      await openModal()

      expect(isOn('cookies.analytics_storage')).toBe(true)
      expect(isOn('cookies.ad_storage')).toBe(false)
      expect(isOn('cookies.necessary')).toBe(true)
    })

    it('locks the necessary categories on', async () => {
      consentGiven(NECESSARY)
      await openModal()

      for (const key of ['cookies.necessary', 'cookies.functionality_storage']) {
        expect(categorySwitch(key).disabled).toBe(true)
        await click(categorySwitch(key))
        expect(isOn(key)).toBe(true)
      }
      expect(dialog()!.textContent).not.toContain(COPY.unsaved)
    })

    it('flips an optional category and says the change is not saved yet', async () => {
      consentGiven(NECESSARY)
      await openModal()
      expect(dialog()!.textContent).not.toContain(COPY.unsaved)

      await click(categorySwitch('cookies.ad_storage'))

      expect(isOn('cookies.ad_storage')).toBe(true)
      expect(dialog()!.querySelector('[role="status"]')?.textContent?.trim()).toBe(COPY.unsaved)
    })

    it('stops calling the change unsaved once it is flipped back', async () => {
      consentGiven(NECESSARY)
      await openModal()

      await click(categorySwitch('cookies.ad_storage'))
      await click(categorySwitch('cookies.ad_storage'))

      expect(isOn('cookies.ad_storage')).toBe(false)
      expect(dialog()!.textContent).not.toContain(COPY.unsaved)
    })
  })

  describe('deciding', () => {
    it('enables every category on accept all, and closes', async () => {
      await openModal()

      await click(button(COPY.acceptAll))

      expect(state().isConsentGiven.value).toBe(true)
      expect(ids(state().cookiesEnabled.value)).toEqual([...NECESSARY, ...OPTIONAL])
      expect(state().cookiesEnabledIds.value).toEqual([...NECESSARY, ...OPTIONAL])
      expect(state().isModalActive.value).toBe(false)
    })

    it('keeps only the necessary categories on decline all — still a decision — and closes', async () => {
      consentGiven([...NECESSARY, ...OPTIONAL])
      await openModal()

      await click(button(COPY.declineAll))

      expect(state().isConsentGiven.value).toBe(true)
      expect(ids(state().cookiesEnabled.value)).toEqual(NECESSARY)
      expect(state().cookiesEnabledIds.value).toEqual(NECESSARY)
      expect(state().isModalActive.value).toBe(false)
    })

    it('saves exactly the selection, in the configured order, and closes', async () => {
      await openModal()

      await click(categorySwitch('cookies.security_storage'))
      await click(categorySwitch('cookies.analytics_storage'))
      await click(button(COPY.save))

      expect(state().isConsentGiven.value).toBe(true)
      expect(ids(state().cookiesEnabled.value)).toEqual([...NECESSARY, 'analytics_storage', 'security_storage'])
      expect(state().cookiesEnabledIds.value).toEqual([...NECESSARY, 'analytics_storage', 'security_storage'])
      expect(state().isModalActive.value).toBe(false)
    })

    it('drops a category the visitor switched off when saving', async () => {
      consentGiven([...NECESSARY, 'ad_storage', 'analytics_storage'])
      await openModal()

      await click(categorySwitch('cookies.ad_storage'))
      await click(button(COPY.save))

      expect(ids(state().cookiesEnabled.value)).toEqual([...NECESSARY, 'analytics_storage'])
    })

    it('keeps the saved decision when closed without saving', async () => {
      consentGiven(NECESSARY)
      await openModal()

      await click(categorySwitch('cookies.ad_storage'))
      await click(closeButton() ?? undefined)

      expect(state().isModalActive.value).toBe(false)
      expect(ids(state().cookiesEnabled.value)).toEqual(NECESSARY)
      // The consent ids are what Google consent mode and the ad pixels
      // read: an unsaved switch must not grant ad_storage.
      expect(state().cookiesEnabledIds.value).toEqual(NECESSARY)
    })

    it('changes no consent while the visitor is still choosing', async () => {
      consentGiven(NECESSARY)
      await openModal()

      await click(categorySwitch('cookies.ad_storage'))

      expect(isOn('cookies.ad_storage')).toBe(true)
      expect(state().cookiesEnabledIds.value).toEqual(NECESSARY)
    })
  })

  describe('a first visit, before any decision', () => {
    it('shows the necessary categories on, as they are set whatever is chosen', async () => {
      await openModal()

      expect(isOn('cookies.necessary')).toBe(true)
      expect(isOn('cookies.functionality_storage')).toBe(true)
      expect(isOn('cookies.ad_storage')).toBe(false)
    })

    it('reports no unsaved change before the visitor makes one', async () => {
      await openModal()

      expect(dialog()!.textContent).not.toContain(COPY.unsaved)
    })
  })

  describe('a forced (first-visit) modal', () => {
    let forcedBefore: boolean

    beforeEach(() => {
      forcedBefore = state().moduleOptions.isModalForced
      state().moduleOptions.isModalForced = true
    })

    afterEach(() => {
      state().moduleOptions.isModalForced = forcedBefore
    })

    it('offers no way out but a decision: no decline-all, no close button', async () => {
      await openModal()

      expect(button(COPY.declineAll)).toBeUndefined()
      expect(closeButton()).toBeNull()
      expect(button(COPY.acceptAll)).toBeDefined()
      expect(button(COPY.save)).toBeDefined()
    })
  })

  describe('category links', () => {
    let linksBefore: Cookie['links']

    beforeEach(() => {
      linksBefore = state().moduleOptions.cookies.optional[0]!.links
    })

    afterEach(() => {
      state().moduleOptions.cookies.optional[0]!.links = linksBefore
    })

    it('links a safe URL and renders a script URL as plain text', async () => {
      state().moduleOptions.cookies.optional[0]!.links = {
        'https://policies.google.com/privacy': null,
        'javascript:alert(1)': null,
      }

      await openModal()

      const hrefs = [...dialog()!.querySelectorAll('a')].map(link => link.getAttribute('href'))
      expect(hrefs).toEqual(['https://policies.google.com/privacy'])
      expect(dialog()!.textContent).toContain('javascript:alert(1)')
    })
  })
})
