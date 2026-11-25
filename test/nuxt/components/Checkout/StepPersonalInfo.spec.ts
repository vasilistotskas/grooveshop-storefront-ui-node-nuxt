import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import * as z from 'zod'
import StepPersonalInfo from '~/components/Checkout/StepPersonalInfo.vue'
import WebsideStepPersonalInfo from '~/components/variants/webside/Checkout/StepPersonalInfo.vue'
import type { UserAddressDetail } from '~~/shared/openapi/types.gen'
import { FIXTURE_TIMESTAMP, fixtureUuid } from '~~/test/fixtures/product'
import { makeCountry } from '~~/test/fixtures/country'
import { trees } from '~~/test/helpers/trees'

/**
 * Step 1 of checkout: who the shopper is and which country the order
 * goes to. The address is the delivery step's (`DeliveryAddress`): a
 * pickup order is delivered to the point and takes none of it (#767).
 *
 * Django's field errors from a rejected order land under their own
 * inputs, and a picked saved address that fails checkout's rules opens
 * its fields.
 */

// The phone field recognises a typed `+code` against every dial code.
// `registerEndpoint` answers the real `useApi` → `$fetch` path, so this
// file mocks neither.
const GREECE = makeCountry()
/** A country without regions: the region field reads `hasRegions`. */
const CYPRUS = makeCountry({
  alpha2: 'CY',
  alpha3: 'CYP',
  isoCc: 196,
  phoneCode: 357,
  postalCodePattern: String.raw`\d{4}`,
  postalCodeExample: '1010',
  phoneMetadata: {
    nationalNumberPattern: String.raw`[257-9]\d{7}`,
    possibleLengths: [8],
    nationalPrefixForParsing: null,
    exampleMobile: '96123456',
  },
  hasRegions: false,
  sortOrder: 2,
  translations: { el: { name: 'Κύπρος' }, en: { name: 'Cyprus' } },
})
registerEndpoint('/api/countries', () => ({ count: 2, results: [GREECE, CYPRUS] }))

// The bootstrap plugin chain calls useUserSession too, so the mock
// carries its whole surface.
const session = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return { loggedIn: ref(false), user: ref<unknown>(null), session: ref({}), ready: ref(true) }
})
mockNuxtImport('useUserSession', () => () => ({
  ...session,
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

function makeAddress(id: number): UserAddressDetail {
  return {
    id,
    title: `Διεύθυνση ${id}`,
    firstName: 'Μαρία',
    lastName: 'Παπαδοπούλου',
    street: 'Πατησίων',
    streetNumber: String(id),
    city: 'Αθήνα',
    zipcode: '10434',
    phone: '+306912345678',
    isMain: id === 1,
    user: 1,
    country: 'GR',
    region: 'GR-I',
    shippable: true,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    uuid: fixtureUuid(7, id),
  }
}

function makeFormState(overrides: Record<string, unknown> = {}) {
  return reactive<Record<string, any>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    ...overrides,
  })
}

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    formState: makeFormState(),
    schema: null,
    countryOptions: [{ label: 'Ελλάδα', value: 'GR' }],
    mode: 'new' as const,
    ...overrides,
  }
}

const t = (key: string, params: Record<string, unknown> = {}): string => useNuxtApp().$i18n.t(key, params)

function hasField(wrapper: VueWrapper, name: string): boolean {
  return wrapper.find(`[name="${name}"]`).exists()
}

describe.each(trees(StepPersonalInfo, WebsideStepPersonalInfo))('$tree Checkout/StepPersonalInfo', ({ tree, C, own }) => {
  beforeEach(() => {
    session.loggedIn.value = false
  })

  const mount = (overrides: Record<string, unknown> = {}, stubs: Record<string, boolean> = {}) =>
    mountSuspended(C, { route: false, props: makeProps(overrides), global: { stubs } })

  // #767: nothing of the address is asked before the delivery is chosen.
  it('asks for the country and no address', async () => {
    const wrapper = await mount()

    expect(wrapper.find('select[autocomplete="country"]').exists()).toBe(true)
    for (const name of ['street', 'streetNumber', 'zipcode', 'city', 'region', 'addressTitle', 'billingVatId']) {
      expect(hasField(wrapper, name), name).toBe(false)
    }
  })

  describe('Django\'s field errors from a rejected order', () => {
    const errors = [
      { name: 'email', message: 'Εισήγαγε έγκυρη διεύθυνση email' },
      { name: 'firstName', message: 'Το όνομα είναι υποχρεωτικό' },
    ]

    it('renders them under their inputs when the step mounts with them', async () => {
      const wrapper = await mount({ serverErrors: errors })
      await nextTick()

      expect(wrapper.text()).toContain(errors[0]!.message)
      expect(wrapper.text()).toContain(errors[1]!.message)
    })

    it('renders errors that arrive after the step mounted', async () => {
      const wrapper = await mount()
      expect(wrapper.text()).not.toContain(errors[0]!.message)

      await wrapper.setProps({ serverErrors: errors })
      await nextTick()

      expect(wrapper.text()).toContain(errors[0]!.message)
    })
  })

  describe('phone: a country picker joined to the number', () => {
    /** The dial code UInput renders in its leading slot, in front of the digits. */
    const dialCode = (wrapper: VueWrapper) =>
      wrapper.find('input[type="tel"]').element.parentElement!.querySelector('[data-slot="leading"]')?.textContent?.trim()

    it('follows the delivery country: its flag on the picker, its code in front of the digits', async () => {
      const wrapper = await mount({
        formState: makeFormState({ country: 'CY', phoneCountry: '' }),
        countryOptions: [{ label: 'Ελλάδα', value: 'GR' }, { label: 'Κύπρος', value: 'CY' }],
      })

      await vi.waitFor(() => expect(dialCode(wrapper)).toBe('+357'))
      const picker = wrapper.findComponent({ name: 'USelectMenu' })
      expect(picker.find('button').attributes('aria-label')).toBe('Κωδικός χώρας τηλεφώνου: Κύπρος (+357)')
      const phone = wrapper.find('input[type="tel"]')
      expect(phone.attributes('autocomplete')).toBe('tel')
      expect(phone.attributes('placeholder')).toBe('96123456')
      // The contract is "padding sized to the code, never an overlay on
      // the digits" — the padding utility is how it is sized.
      expect(phone.classes()).toContain('ps-(--dial-code-length)')
    })

    it('a Greek number can stay +30 while delivering to Cyprus', async () => {
      const wrapper = await mount({
        formState: makeFormState({ country: 'CY', phoneCountry: 'GR' }),
        countryOptions: [{ label: 'Κύπρος', value: 'CY' }],
      })

      await vi.waitFor(() => expect(dialCode(wrapper)).toBe('+30'))
      expect(wrapper.find('input[type="tel"]').attributes('placeholder')).toBe('6912345678')
    })

    it('has no recognised-country badge or hint', async () => {
      const wrapper = await mount({ formState: makeFormState({ country: 'CY', phone: '+35796123456' }) })

      await vi.waitFor(() => expect(dialCode(wrapper)).toBe('+357'))
      expect(wrapper.text()).not.toContain('Αναγνωρίστηκε')
      expect(wrapper.text()).not.toContain('ξεκινήστε')
    })
  })

  describe('the cards (default tree)', () => {
    it.runIf(tree === 'default')('puts contact and recipient in their own titled sections, with the notes last', async () => {
      const wrapper = await mount()

      expect(wrapper.findAll('h2').map(heading => heading.text())).toEqual(['Στοιχεία επικοινωνίας', 'Παραλήπτης'])
      const names = wrapper.findAll('[name]').map(el => el.attributes('name'))
      expect(names.indexOf('email')).toBeLessThan(names.indexOf('firstName'))
      expect(names.indexOf('firstName')).toBeLessThan(names.indexOf('country'))
      expect(names.at(-1)).toBe('customerNotes')
    })

    it.runIf(tree === 'default')('says what the phone number is for', async () => {
      const wrapper = await mount()

      expect(wrapper.text()).toContain('Για ενημερώσεις παράδοσης με SMS.')
    })

    it.runIf(tree === 'default')('drops the contact card while a saved address is picked', async () => {
      const wrapper = await mount({ savedAddresses: [makeAddress(1)], selectedSavedAddressId: 1, mode: 'saved' })

      expect(hasField(wrapper, 'email')).toBe(false)
      expect(wrapper.text()).not.toContain('Στοιχεία επικοινωνίας')
    })
  })

  describe('saved addresses', () => {
    const saved = { savedAddresses: [makeAddress(1), makeAddress(2)], selectedSavedAddressId: 1 }

    it('lists the shopper\'s addresses above the form and reports a pick', async () => {
      const wrapper = await mount({ ...saved, mode: 'new' })

      await wrapper.find('[role="radio"][value="2"]').trigger('click')

      expect(wrapper.emitted('select-saved-address')).toEqual([[2]])
    })

    it.runIf(tree === 'webside')('reports the "new address" card', async () => {
      const wrapper = await mount({ ...saved, mode: 'saved' })

      await wrapper.find('[role="radio"][value="__new__"]').trigger('click')

      expect(wrapper.emitted('use-new-address')).toHaveLength(1)
    })

    it.runIf(tree === 'default')('reports the "new address" button', async () => {
      const wrapper = await mount({ ...saved, mode: 'saved' })

      await wrapper.findAll('button').find(button => button.text() === 'Νέα διεύθυνση')!.trigger('click')

      expect(wrapper.emitted('use-new-address')).toHaveLength(1)
    })

    it('hides the recipient inputs while a saved address is picked', async () => {
      const wrapper = await mount({ ...saved, mode: 'saved' })

      expect(hasField(wrapper, 'firstName')).toBe(false)
      expect(hasField(wrapper, 'country')).toBe(false)
      // Order notes are about the order, not the address.
      expect(hasField(wrapper, 'customerNotes')).toBe(true)
    })

    it('shows no address picker to a shopper without saved addresses', async () => {
      const wrapper = await mount()

      expect(wrapper.findComponent({ name: own('CheckoutSavedAddresses') }).exists()).toBe(false)
      expect(hasField(wrapper, 'firstName')).toBe(true)
    })
  })

  // The demo accounts' saved addresses had no region and no phone
  // (2026-10-16). The saved mode renders neither field, so «Continue»
  // failed on errors with nowhere to show and did nothing on screen. The
  // region is the delivery step's now; the phone and the name are here.
  describe('a saved address that fails checkout\'s rules', () => {
    // Stands in for `step1Schema`: the step only needs a schema that
    // rejects the two fields.
    const NAME_MISSING = 'Συμπλήρωσε το επώνυμο'
    const PHONE_MISSING = 'Συμπλήρωσε το τηλέφωνο'
    const schema = z.object({
      lastName: z.string().min(1, { error: NAME_MISSING }),
      phone: z.string().min(1, { error: PHONE_MISSING }),
    })
    const incomplete = { ...makeAddress(1), lastName: '', phone: '' }

    /**
     * The step inside the checkout page's half of the contract:
     * `edit-address` opens the fields, as `editSelectedAddress` does.
     * Attached, so the scroll can find the field by its id.
     */
    async function mountOpening(overrides: { mode?: 'saved' | 'new', serverErrors?: unknown[] } = {}) {
      const props = makeProps({
        formState: makeFormState({ firstName: 'Μαρία', country: 'GR' }),
        schema,
        savedAddresses: [incomplete],
        selectedSavedAddressId: 1,
        serverErrors: overrides.serverErrors,
      })
      const Page = defineComponent({
        setup() {
          const mode = ref(overrides.mode ?? 'saved')
          const openFields = () => {
            mode.value = 'new'
          }
          return () => h(C, { ...props, mode: mode.value, onEditAddress: openFields })
        },
      })
      const page = await mountSuspended(Page, { route: false, attachTo: document.body })
      return { page, step: page.findComponent(C) }
    }

    /** The control a field's label points at. */
    function controlOf(wrapper: VueWrapper, label: string) {
      const labelEl = wrapper.findAll('label').find(l => l.text().startsWith(label))
      if (!labelEl) throw new Error(`no field "${label}"`)
      return labelEl.attributes('for')
    }

    it('pressing «Continue» opens the address with each error under its field, and goes to the first', async () => {
      const scrolled: string[] = []
      vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (this: Element) {
        scrolled.push(this.id)
      })
      const { page, step } = await mountOpening()

      await (step.vm as unknown as { $: { exposed: { submit: () => Promise<void> } } }).$.exposed.submit()

      await vi.waitFor(() => expect(scrolled).toEqual([controlOf(page, t('form.last_name'))]))
      expect(step.emitted('edit-address')).toHaveLength(1)
      expect(step.emitted('next')).toBeUndefined()
      expect(page.text()).toContain(NAME_MISSING)
      expect(page.text()).toContain(PHONE_MISSING)
    })

    it('opens the address for Django\'s error on a field the card stands for', async () => {
      const message = 'Εισήγαγε έγκυρο αριθμό τηλεφώνου'
      const { page, step } = await mountOpening({ serverErrors: [{ name: 'phone', message }] })

      await vi.waitFor(() => expect(page.text()).toContain(message))
      expect(step.emitted('edit-address')).toHaveLength(1)
    })

    // The webside copy opens the fields but does not mark them ahead of «Continue».
    it.runIf(tree === 'default')('marks what is wrong as soon as the checkout opens a picked address', async () => {
      const { page, step } = await mountOpening({ mode: 'new' })

      await vi.waitFor(() => expect(page.text()).toContain(NAME_MISSING))
      expect(page.text()).toContain(PHONE_MISSING)
      expect(step.emitted('next')).toBeUndefined()
    })
  })

  it('submits through the exposed submit() the sidebar CTA calls', async () => {
    const wrapper = await mount()

    await (wrapper.vm as unknown as { $: { exposed: { submit: () => Promise<void> } } }).$.exposed.submit()
    await vi.waitFor(() => expect(wrapper.emitted('next')).toHaveLength(1))
  })
})
