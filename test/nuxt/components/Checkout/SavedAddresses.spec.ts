import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import CheckoutSavedAddresses from '~/components/Checkout/SavedAddresses.vue'
import WebsideCheckoutSavedAddresses from '~/components/variants/webside/Checkout/SavedAddresses.vue'
import type { UserAddressDetail } from '~~/shared/openapi/types.gen'
import { FIXTURE_TIMESTAMP, fixtureUuid } from '~~/test/fixtures/product'
import { trees } from '~~/test/helpers/trees'

/**
 * The address-book picker on checkout step 1: one card per saved
 * address plus a "new address" card. Fully controlled — it only
 * reports the shopper's choice (`select` with the id, or `new`) and
 * shows whatever the parent says is chosen. The trees differ only in
 * the `en:` block.
 */
function makeAddress(overrides: Partial<UserAddressDetail> = {}): UserAddressDetail {
  const id = overrides.id ?? 1
  return {
    id,
    title: 'Σπίτι',
    firstName: 'Μαρία',
    lastName: 'Παπαδοπούλου',
    street: 'Ερμού',
    streetNumber: '12',
    city: 'Αθήνα',
    zipcode: '10563',
    phone: '+306912345678',
    isMain: false,
    user: 1,
    country: 'GR',
    region: 'GR-I',
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    uuid: fixtureUuid(5, id),
    ...overrides,
  }
}

const ADDRESSES = [
  makeAddress({ id: 1, title: 'Σπίτι', isMain: true }),
  makeAddress({ id: 2, title: 'Γραφείο', street: 'Σταδίου', streetNumber: '', zipcode: '10564' }),
]

const NEW_LABEL = 'Νέα διεύθυνση'

describe.each(trees(CheckoutSavedAddresses, WebsideCheckoutSavedAddresses))('$tree Checkout/SavedAddresses', ({ C }) => {
  const mount = (props: { selectedId: number | null, mode: 'saved' | 'new' }) =>
    mountSuspended(C, { route: false, props: { addresses: ADDRESSES, ...props } })

  const radios = (wrapper: VueWrapper) => wrapper.findAll('[role="radio"]')
  /** The radio whose card carries `label`. */
  const radioFor = (wrapper: VueWrapper, label: string) => {
    const index = wrapper.findAll('label').findIndex(l => l.text().startsWith(label))
    return radios(wrapper)[index]!
  }

  it('offers every saved address, summarised, then a new-address card', async () => {
    const wrapper = await mount({ selectedId: 1, mode: 'saved' })
    // Nuxt UI's RadioGroup slot hooks.
    const labels = wrapper.findAll('[data-slot="label"]').map(l => l.text())
    const descriptions = wrapper.findAll('[data-slot="description"]').map(d => d.text())

    expect(radios(wrapper)).toHaveLength(3)
    expect(labels).toEqual(['Σπίτι · Κύρια', 'Γραφείο', NEW_LABEL])
    expect(descriptions.slice(0, 2)).toEqual([
      'Μαρία Παπαδοπούλου · Ερμού 12 · 10563 Αθήνα',
      // An empty street number leaves no trailing space before the separator.
      'Μαρία Παπαδοπούλου · Σταδίου · 10564 Αθήνα',
    ])
  })

  it.each([
    { props: { selectedId: 2, mode: 'saved' as const }, checked: 'Γραφείο' },
    { props: { selectedId: 2, mode: 'new' as const }, checked: NEW_LABEL },
    { props: { selectedId: null, mode: 'saved' as const }, checked: NEW_LABEL },
  ])('shows $checked as chosen for $props', async ({ props, checked }) => {
    const wrapper = await mount(props)

    expect(radioFor(wrapper, checked).attributes('aria-checked')).toBe('true')
    expect(radios(wrapper).filter(r => r.attributes('aria-checked') === 'true')).toHaveLength(1)
  })

  it('reports the address the shopper picks', async () => {
    const wrapper = await mount({ selectedId: 1, mode: 'saved' })

    await radioFor(wrapper, 'Γραφείο').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[2]])
    expect(wrapper.emitted('new')).toBeUndefined()
  })

  it('reports a switch to typing a new address', async () => {
    const wrapper = await mount({ selectedId: 1, mode: 'saved' })

    await radioFor(wrapper, NEW_LABEL).trigger('click')

    expect(wrapper.emitted('new')).toEqual([[]])
    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
