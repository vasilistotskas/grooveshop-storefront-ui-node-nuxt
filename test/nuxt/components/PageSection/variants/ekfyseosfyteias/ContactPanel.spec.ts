import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ContactPanel from '~/components/PageSection/variants/ekfyseosfyteias/ContactPanel.vue'

/**
 * The sage contact band. Nothing but its copy is a prop: the phone and
 * email are the merchant identity, the address the first public office,
 * the hours the BUSINESS_HOURS setting. A fact the store has not
 * published leaves out its row, label and all.
 */
const store = vi.hoisted(() => ({
  identity: {} as { phone?: string, email?: string },
  offices: [] as Array<Record<string, unknown>>,
  schedule: null as Record<string, { opens: string, closes: string } | null> | null,
}))

mockNuxtImport('useMerchantIdentity', () => () => ({
  identity: computed(() => store.identity),
  hasIdentity: computed(() => true),
  legalName: computed(() => ''),
  registeredSeat: computed(() => ''),
  inLiquidation: computed(() => false),
}))

mockNuxtImport('useStoreOffices', () => () => ({
  offices: computed(() => store.offices),
  phones: computed(() => []),
  hasOffices: computed(() => store.offices.length > 0),
}))

mockNuxtImport('useBusinessHours', () => () => ({
  hasData: computed(() => store.schedule !== null),
  schedule: computed(() => store.schedule),
  timezone: computed(() => 'Europe/Athens'),
  today: computed(() => 'mon'),
  todayHours: computed(() => null),
  isOpen: computed(() => false),
}))

const WORKDAYS = { opens: '10:00', closes: '19:00' }
const WEEK = {
  mon: WORKDAYS,
  tue: WORKDAYS,
  wed: WORKDAYS,
  thu: WORKDAYS,
  fri: WORKDAYS,
  sat: null,
  sun: null,
}

const PROPS = {
  eyebrow: 'Παραγγελίες & επικοινωνία',
  heading: 'Πάρτε μας ένα τηλέφωνο.',
}

const mountPanel = (props: Record<string, unknown> = PROPS) =>
  mountSuspended(ContactPanel, { route: false, props })

const facts = (wrapper: Awaited<ReturnType<typeof mountPanel>>) =>
  wrapper.findAll('dl > div').map(row => [row.find('dt').text(), row.find('dd').text()])

describe('ekfyseosfyteias contact_panel', () => {
  beforeEach(() => {
    store.identity = { phone: '698 162 7561', email: 'ekfyseosfyteias@gmail.com' }
    store.offices = [{ label: 'Έδρα', street: 'Φυτειά Βέροιας', area: 'Τ.Θ. 80', postal: '591 00', city: 'Ημαθία', phones: [], addressLine: '' }]
    store.schedule = WEEK
  })

  it('makes the phone the headline: a tel link that dials only the digits', async () => {
    const wrapper = await mountPanel()

    const phone = wrapper.find('a[href^="tel:"]')
    expect([phone.text(), phone.attributes('href')]).toEqual(['698 162 7561', 'tel:6981627561'])
    expect(wrapper.find('h2').text()).toBe(PROPS.heading)
  })

  it('keeps the plus of an international number', async () => {
    store.identity = { phone: '+30 698 162 7561' }

    const wrapper = await mountPanel()

    expect(wrapper.find('a[href^="tel:"]').attributes('href')).toBe('tel:+306981627561')
  })

  it('links the email', async () => {
    const wrapper = await mountPanel()

    const mail = wrapper.find('a[href^="mailto:"]')
    expect([mail.text(), mail.attributes('href')]).toEqual(['ekfyseosfyteias@gmail.com', 'mailto:ekfyseosfyteias@gmail.com'])
  })

  it('lists the address and the hours as dt/dd pairs, workdays as one range', async () => {
    const wrapper = await mountPanel()

    expect(facts(wrapper)).toEqual([
      ['Διεύθυνση', 'Φυτειά Βέροιας, Τ.Θ. 80591 00 Ημαθία'],
      ['Ωράριο', 'Δευτέρα – Παρασκευή10:00 – 19:00'],
    ])
    // A definition list may hold only dt and dd inside its groups.
    expect(wrapper.findAll('dl > div > *').map(el => el.element.tagName)).toEqual(['DT', 'DD', 'DT', 'DD'])
  })

  it('splits the hours where the schedule changes and skips closed days', async () => {
    store.schedule = { ...WEEK, wed: { opens: '10:00', closes: '14:00' }, sat: { opens: '09:00', closes: '13:00' } }

    const wrapper = await mountPanel()

    expect(wrapper.findAll('dd')[1]!.findAll('span').map(line => line.text())).toEqual([
      'Δευτέρα – Τρίτη',
      '10:00 – 19:00',
      'Τετάρτη',
      '10:00 – 14:00',
      'Πέμπτη – Παρασκευή',
      '10:00 – 19:00',
      'Σάββατο',
      '09:00 – 13:00',
    ])
  })

  it('leaves out the rows the store has not published', async () => {
    store.offices = []
    store.schedule = null

    const wrapper = await mountPanel()

    expect(wrapper.find('dl').exists()).toBe(false)
    expect(wrapper.find('a[href^="tel:"]').exists()).toBe(true)
  })

  it('leaves out the phone and the email when the identity has neither', async () => {
    store.identity = {}

    const wrapper = await mountPanel()

    expect(wrapper.find('a[href^="tel:"]').exists()).toBe(false)
    expect(wrapper.find('a[href^="mailto:"]').exists()).toBe(false)
  })

  it('ends with a button to the contact page', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.findAll('a').at(-1)!.attributes('href')).toBe('/contact')
  })

  it('prints the body and the hint where the section has them', async () => {
    const wrapper = await mountPanel({ ...PROPS, body: 'Για διαθεσιμότητα.', hint: 'Καλέστε πριν έρθετε.' })

    expect(wrapper.text()).toContain('Για διαθεσιμότητα.')
    expect(wrapper.text()).toContain('Καλέστε πριν έρθετε.')
  })

  it('draws nothing when there is nothing to say', async () => {
    store.identity = {}
    store.offices = []
    store.schedule = null

    const wrapper = await mountPanel({})

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
