import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import CheckoutSavedAddresses from '~/components/Checkout/SavedAddresses.vue'
import WebsideCheckoutSavedAddresses from '~/components/variants/webside/Checkout/SavedAddresses.vue'
import type { UserAddressDetail } from '~~/shared/openapi/types.gen'
import { FIXTURE_TIMESTAMP, fixtureUuid } from '~~/test/fixtures/product'
import { trees } from '~~/test/helpers/trees'

/**
 * The address-book picker on checkout step 1. Fully controlled — it only
 * reports the shopper's choice (`select` with the id, or `new`) and
 * shows whatever the parent says is chosen.
 *
 * The default draws one radio card per saved address (title, recipient,
 * street, postcode and city) and a separate "New address" button; the
 * frozen webside copy keeps a "new address" radio card among them.
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

describe.each(trees(CheckoutSavedAddresses, WebsideCheckoutSavedAddresses))('$tree Checkout/SavedAddresses', ({ tree, C }) => {
  const mount = (props: { selectedId: number | null, mode: 'saved' | 'new' }) =>
    mountSuspended(C, { route: false, props: { addresses: ADDRESSES, ...props } })

  const radios = (wrapper: VueWrapper) => wrapper.findAll('[role="radio"]')
  const checked = (wrapper: VueWrapper) => radios(wrapper).filter(r => r.attributes('aria-checked') === 'true')
  /** The radio whose card carries `label`. */
  const radioFor = (wrapper: VueWrapper, label: string) => {
    const index = wrapper.findAll('label').findIndex(l => l.text().startsWith(label))
    return radios(wrapper)[index]!
  }
  const newAddressButton = (wrapper: VueWrapper) => wrapper.findAll('button').find(button => button.text() === NEW_LABEL)!

  it.runIf(tree === 'webside')('offers every saved address, summarised, then a new-address card', async () => {
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

  it.runIf(tree === 'default')('offers a card per saved address — title, recipient, street, postcode and city — and no card for a new one', async () => {
    const wrapper = await mount({ selectedId: 1, mode: 'saved' })
    const labels = wrapper.findAll('[data-slot="label"]').map(l => l.text())
    const lines = wrapper.findAll('[data-slot="description"]').map(d => d.findAll('span > span').map(line => line.text()))

    expect(radios(wrapper)).toHaveLength(2)
    expect(labels).toEqual(['Σπίτι · Κύρια', 'Γραφείο'])
    expect(lines).toEqual([
      ['Μαρία Παπαδοπούλου', 'Ερμού 12', '10563 Αθήνα'],
      // An empty street number leaves no trailing space.
      ['Μαρία Παπαδοπούλου', 'Σταδίου', '10564 Αθήνα'],
    ])
  })

  it.runIf(tree === 'webside').each([
    { props: { selectedId: 2, mode: 'saved' as const }, checked: 'Γραφείο' },
    { props: { selectedId: 2, mode: 'new' as const }, checked: NEW_LABEL },
    { props: { selectedId: null, mode: 'saved' as const }, checked: NEW_LABEL },
  ])('shows $checked as chosen for $props', async ({ props, checked: label }) => {
    const wrapper = await mount(props)

    expect(radioFor(wrapper, label).attributes('aria-checked')).toBe('true')
    expect(checked(wrapper)).toHaveLength(1)
  })

  it.runIf(tree === 'default')('shows the picked address as chosen', async () => {
    const wrapper = await mount({ selectedId: 2, mode: 'saved' })

    expect(radioFor(wrapper, 'Γραφείο').attributes('aria-checked')).toBe('true')
    expect(checked(wrapper)).toHaveLength(1)
  })

  it.runIf(tree === 'default').each([
    { selectedId: 2, mode: 'new' as const },
    { selectedId: null, mode: 'saved' as const },
  ])('shows no address as chosen for $selectedId in $mode mode', async (props) => {
    const wrapper = await mount(props)

    expect(checked(wrapper)).toHaveLength(0)
  })

  it('reports the address the shopper picks', async () => {
    const wrapper = await mount({ selectedId: 1, mode: 'saved' })

    await radioFor(wrapper, 'Γραφείο').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[2]])
    expect(wrapper.emitted('new')).toBeUndefined()
  })

  it.runIf(tree === 'webside')('reports a switch to typing a new address', async () => {
    const wrapper = await mount({ selectedId: 1, mode: 'saved' })

    await radioFor(wrapper, NEW_LABEL).trigger('click')

    expect(wrapper.emitted('new')).toEqual([[]])
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it.runIf(tree === 'default')('reports a switch to typing a new address from the button', async () => {
    const wrapper = await mount({ selectedId: 1, mode: 'saved' })

    await newAddressButton(wrapper).trigger('click')

    expect(wrapper.emitted('new')).toEqual([[]])
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it.runIf(tree === 'default')('marks the new-address button pressed only while typing a new address', async () => {
    const typing = await mount({ selectedId: 1, mode: 'new' })
    expect(newAddressButton(typing).attributes('aria-pressed')).toBe('true')

    const picked = await mount({ selectedId: 1, mode: 'saved' })
    expect(newAddressButton(picked).attributes('aria-pressed')).toBe('false')
  })
})
