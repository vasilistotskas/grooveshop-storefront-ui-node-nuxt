import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SearchBar from '~/components/PageSection/SearchBar.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The search band holds the store's own search field (`search_field`,
 * `resolvePart`): the one its header opens, in every design, so the page has
 * one search. Each design's field is a stand-in naming its design.
 */
const searchField = vi.hoisted(() => (design: string) => ({
  __esModule: true,
  default: { props: ['placeholder', 'size'], template: `<div data-test="search" data-design="${design}" :data-size="size" />` },
}))
vi.mock('~/components/Search/Input.vue', () => searchField('default'))
vi.mock('~/components/variants/webside/Search/Input.vue', () => searchField('webside'))

describe('PageSection/SearchBar', () => {
  it.each([
    ['the platform’s', 'shop_a', 'default'],
    ['webside’s own', 'webside', 'webside'],
  ])('holds %s search field, in its section size', async (_case, schemaName, design) => {
    setTenant({ schemaName })

    const wrapper = await mountSuspended(SearchBar, { route: false, props: { title: 'Βρες κάτι' } })

    await vi.waitFor(() => expect(wrapper.get('[data-test="search"]').attributes('data-design')).toBe(design))
    expect(wrapper.get('[data-test="search"]').attributes('data-size')).toBeUndefined()
  })
})
