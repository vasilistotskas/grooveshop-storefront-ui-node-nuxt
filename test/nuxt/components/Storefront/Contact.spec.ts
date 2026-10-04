import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import Contact from '~/components/Storefront/Contact.vue'

/**
 * The contact page: the enquiry form beside the ways to reach the store
 * and its hours. A tenant's own layout can already carry the form (a
 * `contact_panel`), the hours (`business_hours`) or the page's heading
 * (a hero); the page stands down for each rather than say it twice.
 * The pieces are stubbed (each has its own spec), so what is asserted
 * here is which of them the page decides to draw.
 */
const layout = vi.hoisted(() => ({ sections: [] as Array<{ uuid: string, componentType: string }> }))
mockNuxtImport('usePageConfig', () => async () => ({ sections: ref(layout.sections) }))

const STUBS = {
  ContactForm: { template: '<form data-stub="form" />' },
  ContactMethodsCard: { template: '<section data-stub="methods" />' },
  ContactHoursCard: { template: '<section data-stub="hours" />' },
  PageSectionRenderer: { template: '<div data-stub="section" />' },
  PageBreadcrumb: { template: '<nav data-stub="breadcrumb" />' },
}

const section = (componentType: string) => ({ uuid: `uuid-${componentType}`, componentType })

beforeEach(() => {
  layout.sections = []
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
    layout.sections = [section('page_hero')]

    const wrapper = await mount()

    expect(wrapper.find('h1').exists()).toBe(false)
    expect(drawn(wrapper)).toEqual(['section', 'form', 'methods', 'hours'])
  })
})
