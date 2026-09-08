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
    area: 'Καλαμαριά',
    postal: '551 32',
    city: 'Θεσσαλονίκη',
    phones: ['2310 924 440', '2310 934 169'],
    addressLine: 'Γ. Ρίτσου 7, Καλαμαριά 551 32, Θεσσαλονίκη',
  },
  {
    label: 'Αττική',
    role: 'ΓΡΑΦΕΙΟ',
    street: 'Ιλισίων 23',
    area: 'Ζωγράφου',
    postal: '157 71',
    // Deliberately NOT the label, so the city still prints.
    city: 'Αθήνα',
    phones: ['2311 820 329'],
    addressLine: 'Ιλισίων 23, Ζωγράφου 157 71, Αθήνα',
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

/**
 * The upload step is stubbed here and tested on its own in
 * `useContactAttachments.spec.ts`: what this file cares about is what
 * the PANEL does with it — whether the control is drawn at all, and
 * whether the ids reach the enquiry.
 */
const attachmentStub = vi.hoisted(() => ({
  // Plain state, not refs: `vi.hoisted` runs BEFORE the module graph
  // is initialised, so `ref`/`computed` are not reachable yet. The
  // mock factory below wraps these lazily, which is enough — every
  // test sets the state and then mounts, so nothing has to react.
  enabled: false,
  uploads: [] as Array<Record<string, unknown>>,
  ids: [] as string[],
  isUploading: false,
  added: [] as File[][],
  resets: { count: 0 },
}))
mockNuxtImport('useContactAttachments', () => () => ({
  enabled: computed(() => attachmentStub.enabled),
  maxCount: computed(() => 3),
  maxMegabytes: computed(() => 25),
  maxBytes: computed(() => 25 * 1024 * 1024),
  allowedTypes: computed(() => ['application/pdf', 'application/zip']),
  accept: computed(() => 'application/pdf,application/zip'),
  uploads: computed(() => attachmentStub.uploads),
  attachmentIds: computed(() => attachmentStub.ids),
  isUploading: computed(() => attachmentStub.isUploading),
  canAddMore: computed(() => attachmentStub.uploads.length < 3),
  add: (files: File[]) => {
    attachmentStub.added.push(files)
    return []
  },
  remove: () => {},
  retry: () => {},
  reset: () => {
    attachmentStub.resets.count += 1
  },
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
    attachmentStub.enabled = false
    attachmentStub.uploads = []
    attachmentStub.ids = []
    attachmentStub.isUploading = false
    attachmentStub.added.length = 0
    attachmentStub.resets.count = 0
  })

  it('reads the offices from the setting, with each one role and phones', async () => {
    const wrapper = await mountSuspended(ContactPanel, { props: PROPS })
    const text = wrapper.text()

    // The card's title IS the city, so the address does not repeat it.
    expect(text).toContain('Γ. Ρίτσου 7, Καλαμαριά 551 32')
    expect(text).not.toContain('551 32, Θεσσαλονίκη')
    // …but a city that is not the label still prints.
    expect(text).toContain('Ιλισίων 23, Ζωγράφου 157 71, Αθήνα')
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

  it('draws no attachment control while the store does not accept files', async () => {
    // The endpoint 404s when the setting is off, so a control would be
    // an affordance for something that cannot happen.
    const wrapper = await mountSuspended(ContactPanel, { props: PROPS })

    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
  })

  it('draws the dropzone, with the store own limits on it', async () => {
    attachmentStub.enabled = true

    const wrapper = await mountSuspended(ContactPanel, { props: PROPS })

    const picker = wrapper.find('input[type="file"]')
    expect(picker.exists()).toBe(true)
    expect(picker.attributes('multiple')).toBeDefined()
    // The button below is the labelled control; leaving the input
    // focusable too would put an invisible stop before it.
    expect(picker.attributes('tabindex')).toBe('-1')
    expect(picker.attributes('aria-hidden')).toBe('true')
    // The picker filter is the store's list, not a constant.
    expect(picker.attributes('accept'))
      .toBe('application/pdf,application/zip')
    const text = wrapper.text()
    expect(text).toContain('3')
    expect(text).toContain('25')
    expect(text).toContain('application/pdf, application/zip')
  })

  it('hands picked files to the upload step', async () => {
    attachmentStub.enabled = true
    const wrapper = await mountSuspended(ContactPanel, { props: PROPS })

    const picker = wrapper.find('input[type="file"]')
    const picked = new File([new Uint8Array(8)], 'tender.pdf', {
      type: 'application/pdf',
    })
    Object.defineProperty(picker.element, 'files', {
      value: [picked],
      configurable: true,
    })
    await picker.trigger('change')

    expect(attachmentStub.added).toHaveLength(1)
    expect(attachmentStub.added[0]!.map(f => f.name)).toEqual(['tender.pdf'])
  })

  it('sends the uploaded ids with the enquiry, then spends them', async () => {
    attachmentStub.enabled = true
    attachmentStub.ids = ['id-one', 'id-two']
    const wrapper = await mountSuspended(ContactPanel, { props: PROPS })

    await fillAndSubmit(wrapper)

    expect(posted).toHaveLength(1)
    expect(posted[0]!.attachmentIds).toEqual(['id-one', 'id-two'])
    // One id claims one enquiry; a second submit must not re-send them.
    expect(attachmentStub.resets.count).toBe(1)
  })

  it('omits the field entirely when nothing was attached', async () => {
    attachmentStub.enabled = true
    const wrapper = await mountSuspended(ContactPanel, { props: PROPS })

    await fillAndSubmit(wrapper)

    expect(posted).toHaveLength(1)
    expect(posted[0]!.attachmentIds).toBeUndefined()
  })

  it('will not send while bytes are still in flight', async () => {
    // An upload that has not finished has no id yet, so submitting
    // would silently drop the file the visitor is watching upload.
    attachmentStub.enabled = true
    attachmentStub.isUploading = true
    const wrapper = await mountSuspended(ContactPanel, { props: PROPS })

    await fillAndSubmit(wrapper)

    expect(posted).toHaveLength(0)
    expect(wrapper.find('button[type="submit"]').attributes('disabled'))
      .toBeDefined()
  })
})

/** A valid enquiry, filled in and submitted. */
async function fillAndSubmit(wrapper: Awaited<ReturnType<typeof mountSuspended>>) {
  await wrapper.find('input[autocomplete="name"]')
    .setValue('Κώστας Παπαδόπουλος')
  await wrapper.find('input[type="email"]').setValue('kostas@deya.gr')
  await wrapper.find('textarea')
    .setValue('Το αντλιοστάσιο χρειάζεται νέο σύστημα τηλεμετρίας άμεσα.')
  await wrapper.find('[role="checkbox"]').trigger('click')
  await wrapper.find('form').trigger('submit')
  await new Promise(resolve => setTimeout(resolve, 50))
}
