import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SearchInput from '~/components/Search/Input.vue'

/**
 * The control that opens the search palette. In the header (`compact`)
 * it is an icon button below `lg` and a field from `lg` up — both in
 * the markup, switched by CSS, so the cached render is the same for
 * every device; elsewhere it is the field alone.
 */
vi.mock('~/components/Search/Modal.vue', () => ({
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
})
