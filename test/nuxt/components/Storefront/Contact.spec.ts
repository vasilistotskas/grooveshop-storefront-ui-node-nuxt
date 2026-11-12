import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import Contact from '~/components/Storefront/Contact.vue'
import WebsideContact from '~/components/variants/webside/Storefront/Contact.vue'

/**
 * The contact page: the enquiry form beside the ways to reach the store
 * and its hours. A tenant's own page can already carry the form (a
 * `contact_panel`), the hours (`business_hours`) or the page's heading
 * (a hero); the page stands down for each rather than say it twice.
 * The pieces are stubbed (each has its own spec), so what is asserted
 * here is which of them the page decides to draw.
 */
const layout = vi.hoisted(() => ({ sections: [] as BuilderSection[] }))
mockNuxtImport('useBuilderPage', () => async () => ({ sections: ref(layout.sections) }))

// What the store published: webside's page reads it to decide whether the
// form shares its row with the side cards.
const published = vi.hoisted(() => ({ methods: true, hours: true }))
mockNuxtImport('useContactMethods', () => () => ({ hasAny: computed(() => published.methods) }))
mockNuxtImport('useBusinessHours', () => () => ({ hasData: computed(() => published.hours) }))

const STUBS = {
  ContactForm: { template: '<form data-stub="form" />' },
  ContactMethodsCard: { template: '<section data-stub="methods" />' },
  ContactHoursCard: { template: '<section data-stub="hours" />' },
  PageSectionRenderer: { template: '<div data-stub="section" />' },
  PageBreadcrumb: { template: '<nav data-stub="breadcrumb" />' },
}

const section = (componentType: string, props: BuilderSection['props'] = {}): BuilderSection => ({ id: `id-${componentType}`, componentType, props })

beforeEach(() => {
  layout.sections = []
  published.methods = true
  published.hours = true
})

async function mount() {
  const wrapper = await mountSuspended(Contact, { route: false, global: { stubs: STUBS } })
  await flushPromises()
  return wrapper
}

const drawn = (wrapper: Awaited<ReturnType<typeof mount>>) =>
  wrapper.findAll('[data-stub]').map(element => element.attributes('data-stub'))

describe('Storefront/Contact', () => {
  it('heads the page and puts the form beside the contact details and the hours', async () => {
    const wrapper = await mount()

    expect(wrapper.find('h1').text()).toBe('Μίλα με έναν άνθρωπο')
    expect(drawn(wrapper)).toEqual(['breadcrumb', 'form', 'methods', 'hours'])
  })

  it('stands down for a layout that carries its own enquiry form', async () => {
    layout.sections = [section('contact_panel')]

    const wrapper = await mount()

    // `contact_panel` owns the heading too, so there is no crumb above it.
    expect(drawn(wrapper)).toEqual(['section'])
    expect(wrapper.find('h1').exists()).toBe(false)
  })

  it('leaves the hours to a layout that already shows them', async () => {
    layout.sections = [section('business_hours')]

    const wrapper = await mount()

    expect(drawn(wrapper)).toEqual(['breadcrumb', 'section', 'form', 'methods'])
  })

  it('leaves the heading and the breadcrumb to a layout that opens with its own hero', async () => {
    layout.sections = [section('hero_banner', { heading: 'Μίλα μαζί μας' })]

    const wrapper = await mount()

    expect(wrapper.find('h1').exists()).toBe(false)
    expect(drawn(wrapper)).toEqual(['section', 'form', 'methods', 'hours'])
  })
})

const WEBSIDE_STUBS = {
  WebsideContactForm: { template: '<form data-stub="form" />' },
  WebsideContactMethodsCard: { template: '<section data-stub="methods" />' },
  WebsideContactHoursCard: { template: '<section data-stub="hours" />' },
  PageSectionRenderer: { template: '<div data-stub="section" />' },
  WebsidePageBreadcrumb: { template: '<nav data-stub="breadcrumb" />' },
}

async function mountWebside() {
  const wrapper = await mountSuspended(WebsideContact, { route: false, global: { stubs: WEBSIDE_STUBS } })
  await flushPromises()
  return wrapper
}

describe('webside Storefront/Contact', () => {
  it('puts the form beside the contact details and the hours', async () => {
    const wrapper = await mountWebside()

    expect(drawn(wrapper)).toEqual(['breadcrumb', 'form', 'methods', 'hours'])
  })

  it('keeps the form alone, and narrow, for a store that published nothing', async () => {
    published.methods = false
    published.hours = false

    const wrapper = await mountWebside()

    expect(drawn(wrapper)).toEqual(['breadcrumb', 'form'])
    // The width is the contract: a lone form keeps its reading measure, and the
    // page only widens to share the row with the cards.
    expect(wrapper.find('.max-w-2xl').exists()).toBe(true)
    expect(wrapper.find('.max-w-5xl').exists()).toBe(false)
  })

  it('widens the page to share the row with the cards', async () => {
    const wrapper = await mountWebside()

    expect(wrapper.find('.max-w-5xl').exists()).toBe(true)
  })

  it('leaves the hours to a layout that already shows them', async () => {
    layout.sections = [section('business_hours')]

    expect(drawn(await mountWebside())).toEqual(['breadcrumb', 'section', 'form', 'methods'])
  })

  it('stands down for a layout that carries its own enquiry form', async () => {
    layout.sections = [section('contact_panel')]

    expect(drawn(await mountWebside())).toEqual(['breadcrumb', 'section'])
  })

  it('shows no side column when the only card is hidden by the layout', async () => {
    layout.sections = [section('business_hours')]
    published.methods = false

    const wrapper = await mountWebside()

    expect(drawn(wrapper)).toEqual(['breadcrumb', 'section', 'form'])
    expect(wrapper.find('.max-w-5xl').exists()).toBe(false)
  })
})
