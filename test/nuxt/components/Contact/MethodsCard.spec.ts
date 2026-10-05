import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import MethodsCard from '~/components/Contact/MethodsCard.vue'

/**
 * The contact page's "other ways to reach us": the merchant's own phone,
 * email and offices, and nothing when it has published none of them.
 */
type Office = { label: string, street: string, area?: string, postal?: string, city?: string, phones: string[], addressLine: string }

const data = vi.hoisted(() => ({
  identity: null as { phone?: string, email?: string } | null,
  offices: [] as Array<{ label: string, street: string, area?: string, postal?: string, city?: string, phones: string[], addressLine: string }>,
  hours: { hasData: false, todayHours: null as { opens: string, closes: string } | null },
}))

mockNuxtImport('useMerchantIdentity', () => () => ({ identity: computed(() => data.identity) }))
mockNuxtImport('useStoreOffices', () => () => ({ offices: computed(() => data.offices) }))
mockNuxtImport('useBusinessHours', () => () => ({
  hasData: computed(() => data.hours.hasData),
  todayHours: computed(() => data.hours.todayHours),
}))

const OFFICE: Office = {
  label: 'Θεσσαλονίκη',
  street: 'Τσιμισκή 100',
  area: '3ος όροφος',
  postal: '54622',
  city: 'Θεσσαλονίκη',
  phones: [],
  addressLine: 'Τσιμισκή 100, 54622 Θεσσαλονίκη',
}

beforeEach(() => {
  data.identity = null
  data.offices = []
  data.hours = { hasData: false, todayHours: null }
})

async function mount() {
  return mountSuspended(MethodsCard, { route: false })
}

describe('Contact/MethodsCard', () => {
  it('links the phone and the email so they can be tapped', async () => {
    data.identity = { phone: '+30 2310 000000', email: 'hello@example.com' }

    const wrapper = await mount()

    expect(wrapper.find('a[href^="tel:"]').attributes('href')).toBe('tel:+30 2310 000000')
    expect(wrapper.find('a[href^="mailto:"]').attributes('href')).toBe('mailto:hello@example.com')
  })

  it('names each office by its street, with its postcode and city under it', async () => {
    data.offices = [OFFICE]

    const wrapper = await mount()

    expect(wrapper.find('li').text()).toContain('Τσιμισκή 100, 3ος όροφος')
    expect(wrapper.find('li').text()).toContain('54622 Θεσσαλονίκη')
  })

  it('says today\'s hours under the phone when the store has published hours', async () => {
    data.identity = { phone: '+30 2310 000000' }
    data.hours = { hasData: true, todayHours: { opens: '09:00', closes: '20:00' } }

    const wrapper = await mount()

    expect(wrapper.text()).toContain('Σήμερα 09:00–20:00')
  })

  it('says nothing about hours on a day the store is closed', async () => {
    data.identity = { phone: '+30 2310 000000' }
    data.hours = { hasData: true, todayHours: null }

    const wrapper = await mount()

    expect(wrapper.text()).not.toContain('Σήμερα')
  })

  it('draws no card for a store that has published nothing', async () => {
    const wrapper = await mount()

    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('leaves out a phone or email the store did not publish', async () => {
    data.identity = { email: 'hello@example.com' }

    const wrapper = await mount()

    expect(wrapper.find('a[href^="tel:"]').exists()).toBe(false)
    expect(wrapper.find('a[href^="mailto:"]').exists()).toBe(true)
  })
})
