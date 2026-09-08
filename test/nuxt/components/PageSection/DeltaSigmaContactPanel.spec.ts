import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ContactPanel from '~/components/PageSection/variants/delta_sigma/ContactPanel.vue'

/**
 * The Δelta Σigma contact page. What matters here is not the layout:
 *
 * - the SUBJECT the visitor picks is what reaches `Contact.subject`,
 *   and it is one of the store's own declared chips or nothing;
 * - the offices come from the STORE_OFFICES setting, never from props,
 *   so the page cannot disagree with the footer about an address;
 * - the consent tick is required, and the enquiry cannot be sent
 *   without it.
 */
const OFFICES = [
  {
    label: 'Θεσσαλονίκη',
    role: 'ΕΔΡΑ',
    street: 'Γ. Ρίτσου 7',
    phones: ['2310 924 440', '2310 934 169'],
    addressLine: 'Γ. Ρίτσου 7, Καλαμαριά 551 32, Θεσσαλονίκη',
  },
  {
    label: 'Αττική',
    role: 'ΓΡΑΦΕΙΟ',
    street: 'Ιλισίων 23',
    phones: ['2311 820 329'],
    addressLine: 'Ιλισίων 23, Ζωγράφου 157 71, Αττική',
  },
]

const PROPS = {
  eyebrow: 'Επικοινωνία',
  heading: 'Πείτε μας τι πρέπει να λειτουργήσει.',
  body: 'Δύο γραφεία, Θεσσαλονίκη και Αττική.',
  hint: 'Όσο πιο συγκεκριμένη η περιγραφή, τόσο πιο ακριβής η προσφορά.',
  responseTime: 'Απάντηση εντός 2 εργάσιμων ημερών',
  subjects: [
    { label: 'Προσφορά έργου' },
    { label: 'DeSET / ΑΠΕ' },
    { label: 'Υποστήριξη' },
    { label: 'Άλλο' },
  ],
}

// `$fetch` is a Nuxt auto-import, so it is mocked as one — a
// `stubGlobal` leaves the component's own binding untouched.
const { mockFetch, posted } = vi.hoisted(() => {
  const posted: Array<Record<string, unknown>> = []
  return {
    posted,
    mockFetch: vi.fn((url: unknown, opts?: { body?: Record<string, unknown> }) => {
      if (String(url) === '/api/contact') {
        posted.push(opts?.body ?? {})
        return Promise.resolve({ id: 1 })
      }
      return Promise.resolve({})
    }),
  }
})
mockNuxtImport('$fetch', () => mockFetch)

mockNuxtImport('useStoreOffices', () => () => ({
  offices: computed(() => OFFICES),
  phones: computed(() => OFFICES.flatMap(o => o.phones)),
  hasOffices: computed(() => true),
}))

mockNuxtImport('useMerchantIdentity', () => () => ({
  identity: computed(() => ({
    email: 'contact@delta-sigma.gr',
    registrationNumber: '156013906000',
  })),
  hasIdentity: computed(() => true),
  legalName: computed(() => 'ΑΙΚ. ΔΗΜΟΠΟΥΛΟΥ - Μ. ΣΦΗΚΑΣ Ο.Ε.'),
  registeredSeat: computed(() => ''),
  inLiquidation: computed(() => false),
  isComplete: computed(() => true),
  missingFields: computed(() => []),
}))

describe('delta_sigma ContactPanel', () => {
  beforeEach(() => {
    posted.length = 0
  })

  it('reads the offices from the setting, with each one role and phones', async () => {
    const wrapper = await mountSuspended(ContactPanel, { props: PROPS })
    const text = wrapper.text()

    expect(text).toContain('Γ. Ρίτσου 7, Καλαμαριά 551 32, Θεσσαλονίκη')
    expect(text).toContain('ΕΔΡΑ')
    expect(text).toContain('ΓΡΑΦΕΙΟ')
    // Every published number is dialable, not just the first.
    const tels = wrapper.findAll('a[href^="tel:"]').map(a => a.attributes('href'))
    expect(tels).toEqual(['tel:2310924440', 'tel:2310934169', 'tel:2311820329'])
    expect(wrapper.find('a[href^="mailto:"]').exists()).toBe(true)
  })

  it('owns the page heading', async () => {
    const wrapper = await mountSuspended(ContactPanel, { props: PROPS })

    expect(wrapper.find('h1').text()).toBe(PROPS.heading)
  })

  it('offers the store own subjects as one radiogroup, first one chosen', async () => {
    const wrapper = await mountSuspended(ContactPanel, { props: PROPS })

    const radios = wrapper.findAll('[role="radio"]')
    expect(radios.map(r => r.text())).toEqual(
      PROPS.subjects.map(s => s.label),
    )
    expect(radios.map(r => r.attributes('aria-checked'))).toEqual(
      ['true', 'false', 'false', 'false'],
    )
    // Only the chosen chip is in the tab order, as a radiogroup means.
    expect(radios.map(r => r.attributes('tabindex'))).toEqual(
      ['0', '-1', '-1', '-1'],
    )
  })

  it('moves through the subjects with the arrow keys', async () => {
    const wrapper = await mountSuspended(ContactPanel, { props: PROPS })
    const radios = wrapper.findAll('[role="radio"]')

    await radios[0]!.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.findAll('[role="radio"]')[1]!.attributes('aria-checked'))
      .toBe('true')

    await radios[1]!.trigger('keydown', { key: 'End' })
    expect(wrapper.findAll('[role="radio"]')[3]!.attributes('aria-checked'))
      .toBe('true')

    await radios[3]!.trigger('keydown', { key: 'ArrowRight' })
    // Wraps, rather than stopping at the end.
    expect(wrapper.findAll('[role="radio"]')[0]!.attributes('aria-checked'))
      .toBe('true')
  })

  it('sends the chosen subject with the enquiry', async () => {
    const wrapper = await mountSuspended(ContactPanel, { props: PROPS })

    await wrapper.findAll('[role="radio"]')[2]!.trigger('click')
    await wrapper.find('input[name="name"], input[autocomplete="name"]')
      .setValue('Κώστας Παπαδόπουλος')
    await wrapper.find('input[type="email"]').setValue('kostas@deya.gr')
    await wrapper.find('input[autocomplete="organization"]')
      .setValue('ΔΕΥΑ Καστοριάς')
    await wrapper.find('input[type="tel"]').setValue('2467 022 111')
    await wrapper.find('textarea')
      .setValue('Το αντλιοστάσιο χρειάζεται νέο σύστημα τηλεμετρίας άμεσα.')
    // Nuxt UI's checkbox is a Reka UI `[role="checkbox"]` button; the
    // native input beside it is only there for form submission and
    // does not drive the model.
    await wrapper.find('[role="checkbox"]').trigger('click')
    await wrapper.find('form').trigger('submit')
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(posted).toHaveLength(1)
    expect(posted[0]).toMatchObject({
      name: 'Κώστας Παπαδόπουλος',
      email: 'kostas@deya.gr',
      company: 'ΔΕΥΑ Καστοριάς',
      phone: '2467 022 111',
      subject: 'Υποστήριξη',
    })
    // The consent tick is not a field on the record: it cannot be
    // false, so a column for it would state nothing.
    expect(posted[0]).not.toHaveProperty('consent')
  })

  it('refuses to send without consent', async () => {
    const wrapper = await mountSuspended(ContactPanel, { props: PROPS })

    await wrapper.find('input[autocomplete="name"]').setValue('Κώστας')
    await wrapper.find('input[type="email"]').setValue('kostas@deya.gr')
    await wrapper.find('textarea')
      .setValue('Το αντλιοστάσιο χρειάζεται νέο σύστημα τηλεμετρίας άμεσα.')
    await wrapper.find('form').trigger('submit')
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(posted).toHaveLength(0)
  })

  it('renders the attachment row as an email, not a dropzone', async () => {
    // The artboard draws a 25 MB upload target. There is no anonymous
    // upload endpoint on this platform, so the row says what it can
    // actually do rather than accepting a file it would drop.
    const wrapper = await mountSuspended(ContactPanel, { props: PROPS })

    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
    expect(wrapper.find('[type="file"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('contact@delta-sigma.gr')
  })
})
