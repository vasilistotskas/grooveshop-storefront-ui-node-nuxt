import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import Feedback from '~/components/Storefront/Feedback.vue'

/**
 * The feedback page: its own heading and the form, with the tenant's
 * branded sections above — and no second heading when one of them is
 * already the page's.
 */
const layout = vi.hoisted(() => ({ sections: [] as Array<{ uuid: string, componentType: string }> }))
mockNuxtImport('usePageConfig', () => async () => ({ sections: ref(layout.sections) }))

const STUBS = {
  FeedbackForm: { template: '<form data-stub="form" />' },
  PageSectionRenderer: { template: '<div data-stub="section" />' },
  PageBreadcrumb: { template: '<nav data-stub="breadcrumb" />' },
}

beforeEach(() => {
  layout.sections = []
})

async function mount() {
  const wrapper = await mountSuspended(Feedback, { route: false, global: { stubs: STUBS } })
  await flushPromises()
  return wrapper
}

describe('Storefront/Feedback', () => {
  it('heads the page and draws the form under the breadcrumb', async () => {
    const wrapper = await mount()

    expect(wrapper.find('h1').text()).toBe('Πώς τα πήγαμε;')
    expect(wrapper.findAll('[data-stub]').map(element => element.attributes('data-stub'))).toEqual(['breadcrumb', 'form'])
  })

  it('draws the tenant\'s sections above the form', async () => {
    layout.sections = [{ uuid: 'a', componentType: 'rich_text' }]

    const wrapper = await mount()

    expect(wrapper.findAll('[data-stub]').map(element => element.attributes('data-stub'))).toEqual(['breadcrumb', 'section', 'form'])
  })

  it('does not add a second heading when a section already owns it', async () => {
    layout.sections = [{ uuid: 'a', componentType: 'page_hero' }]

    const wrapper = await mount()

    expect(wrapper.find('h1').exists()).toBe(false)
  })
})
