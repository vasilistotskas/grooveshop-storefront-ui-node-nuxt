import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import type { UserAddress } from '~~/shared/openapi/types.gen'
import AddressList from '~/components/Address/List.vue'
import { FIXTURE_TIMESTAMP, fixtureUuid } from '~~/test/fixtures/product'

const address = (id: number, title: string): UserAddress => ({
  id,
  title,
  firstName: 'Μαρία',
  lastName: 'Παπαδοπούλου',
  street: 'Ερμού',
  streetNumber: String(id),
  city: 'Αθήνα',
  zipcode: '10563',
  phone: '+306912345678',
  user: 7,
  country: 'GR',
  region: 'GR-I',
  createdAt: FIXTURE_TIMESTAMP,
  updatedAt: FIXTURE_TIMESTAMP,
  uuid: fixtureUuid(11, id),
})

// The card has its own spec; here it only has to show which address it
// got and be able to report a deletion.
const AddressCard = defineComponent({
  props: { address: { type: Object, required: true } },
  emits: ['address-delete'],
  template: '<li data-testid="card" @click="$emit(\'address-delete\', address.id)">{{ address.title }}</li>',
})

const mountList = (props: { addresses: UserAddress[] | null, addressesCount?: number, displayTotal?: boolean }) =>
  mountSuspended(AddressList, { props, global: { stubs: { AddressCard } }, route: false })

describe('Address/List', () => {
  it('renders one card per address, in order', async () => {
    const wrapper = await mountList({ addresses: [address(1, 'Σπίτι'), address(2, 'Γραφείο')] })

    expect(wrapper.findAll('[data-testid="card"]').map(card => card.text())).toEqual(['Σπίτι', 'Γραφείο'])
  })

  it.each([
    [0, 'Χωρίς Διευθύνσεις'],
    [1, '1 Διεύθυνση'],
    [3, '3 Διευθύνσεις'],
  ])('counts %i addresses as "%s" when asked to show the total', async (count, label) => {
    const wrapper = await mountList({ addresses: [], addressesCount: count, displayTotal: true })

    expect(wrapper.text()).toBe(label)
  })

  it('shows no total unless asked', async () => {
    const wrapper = await mountList({ addresses: [address(1, 'Σπίτι')], addressesCount: 1 })

    expect(wrapper.text()).toBe('Σπίτι')
  })

  it('passes a card\'s deletion up so the page can refetch', async () => {
    const wrapper = await mountList({ addresses: [address(1, 'Σπίτι')] })

    await wrapper.get('[data-testid="card"]').trigger('click')

    expect(wrapper.emitted('address-delete')).toHaveLength(1)
  })
})
