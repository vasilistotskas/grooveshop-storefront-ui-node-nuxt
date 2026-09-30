import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AddressAddNew from '~/components/Address/AddNew.vue'

describe('Address/AddNew', () => {
  it('invites a shopper without addresses to add one, linking to the new-address page', async () => {
    const wrapper = await mountSuspended(AddressAddNew, { route: false })

    expect(wrapper.find('h3').text()).toBe('Δεν έχεις καμία διεύθυνση')
    const link = wrapper.get('a')
    expect(link.attributes('href')).toBe('/account/addresses/new')
    expect(link.text()).toBe('Προσθήκη Διεύθυνσης')
  })
})
