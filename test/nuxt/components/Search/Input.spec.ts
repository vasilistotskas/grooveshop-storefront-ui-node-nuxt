import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SearchInput from '~/components/Search/Input.vue'
import WebsideSearchInput from '~/components/variants/webside/Search/Input.vue'

/**
 * The control that opens the search palette. In the header (`compact`)
 * it is an icon button below `lg` and a field from `lg` up — both in
 * the markup, switched by CSS, so the cached render is the same for
 * every device; elsewhere it is the field alone.
 */
vi.mock('~/components/Search/Modal.vue', () => ({
  default: { props: ['open', 'query'], template: '<div data-test="palette" :data-open="open" />' },
}))
vi.mock('~/components/variants/webside/Search/Modal.vue', () => ({
  default: { props: ['open', 'query'], template: '<div data-test="palette" :data-open="open" />' },
}))

const COPY = { placeholder: 'Αναζήτηση στο κατάστημα' }

describe('Search/Input', () => {
  it('gives the header an icon button and a field', async () => {
    const wrapper = await mountSuspended(SearchInput, { route: false, props: { compact: true } })

    expect(wrapper.find(`button[aria-label="${COPY.placeholder}"]`).exists()).toBe(true)
    expect(wrapper.findAll('button').some(button => button.text().includes(COPY.placeholder))).toBe(true)
  })

  it('is the field alone elsewhere', async () => {
    const wrapper = await mountSuspended(SearchInput, { route: false })

    expect(wrapper.find(`button[aria-label="${COPY.placeholder}"]`).exists()).toBe(false)
    expect(wrapper.findAll('button')).toHaveLength(1)
  })

  it('opens the palette', async () => {
    const wrapper = await mountSuspended(SearchInput, { route: false })

    await wrapper.find('button').trigger('click')

    await vi.waitFor(() => expect(wrapper.find('[data-test="palette"]').attributes('data-open')).toBe('true'))
  })
  // A page that also draws the field in a section (the search band, a hero)
  // answered "/" with one palette per field, stacked: the header's field
  // owns the shortcut, and a section's field registers none.
  it('answers the search shortcut in the header only', async () => {
    const header = await mountSuspended(SearchInput, { route: false, props: { compact: true } })
    const section = await mountSuspended(SearchInput, { route: false })

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }))

    await vi.waitFor(() => expect(header.find('[data-test="palette"]').attributes('data-open')).toBe('true'))
    expect(section.find('[data-test="palette"]').exists()).toBe(false)
  })
})

describe('webside Search/Input', () => {
  it('names the field by its visible text on a desktop, with no label of its own to contradict it', async () => {
    const wrapper = await mountSuspended(WebsideSearchInput, { route: false })

    // WCAG 2.5.3: an aria-label that is not the visible text (the key hint
    // is part of it) is a name a voice-control user cannot say.
    const button = wrapper.find('button')
    expect(button.attributes('aria-label')).toBeUndefined()
    expect(button.text()).toContain((wrapper.vm as unknown as { t: (k: string) => string }).t('search.placeholder'))
  })
})
