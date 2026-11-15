import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { Component } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SearchInput from '~/components/Search/Input.vue'
import WebsideSearchInput from '~/components/variants/webside/Search/Input.vue'
import { inlineCopy } from '~~/test/helpers/inlineCopy'
import { trees } from '~~/test/helpers/trees'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

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

const COPY = { placeholder: inlineCopy('app/components/Search/Input.vue').search.placeholder }

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

  // The classes are the contract: a phone's tap target is at least 44px
  // (WCAG 2.5.5), measured in the real layout at 390px, while from `sm` up
  // the control keeps the size it had. happy-dom lays nothing out.
  it('makes a section field a 44px target on a phone, and leaves the header field as it is', async () => {
    const section = await mountSuspended(SearchInput, { route: false })
    const header = await mountSuspended(SearchInput, { route: false, props: { compact: true } })

    expect(section.get('button').classes()).toEqual(expect.arrayContaining(['h-11', 'sm:h-10.5']))
    expect(header.findAll('button').at(-1)!.classes()).toEqual(expect.arrayContaining(['h-10.5']))
    expect(header.findAll('button').at(-1)!.classes()).not.toContain('h-11')
  })

  it('gives a hero’s large field one tab stop: its button beside it is for a pointer only, and opens the same palette', async () => {
    const wrapper = await mountSuspended(SearchInput, { route: false, props: { size: 'lg' } })

    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(2)
    // Tab stops, and what assistive tech meets: the field alone in both.
    expect(buttons.map(button => button.attributes('tabindex') !== '-1')).toEqual([true, false])
    expect(buttons.map(button => button.attributes('aria-hidden') !== 'true')).toEqual([true, false])
    await buttons[1]!.trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-test="palette"]').attributes('data-open')).toBe('true'))
  })

  it('opens the palette', async () => {
    const wrapper = await mountSuspended(SearchInput, { route: false })

    await wrapper.find('button').trigger('click')

    await vi.waitFor(() => expect(wrapper.find('[data-test="palette"]').attributes('data-open')).toBe('true'))
  })
})

/**
 * ONE search field of the page owns the shortcut (`useSearchShortcut`): the
 * header's when there is one, else the first section field. A page that drew
 * the field in a section too used to answer "/" with one palette per field,
 * stacked; only the owner shows the key hint and states `aria-keyshortcuts`.
 */
describe('the search shortcut', () => {
  /**
   * The fields of one page, mounted together as a page holds them (each field
   * is told apart by its place in the page, `useId`): `fields` lists which
   * is the header's, and `shown` which are drawn, so a test can take one away.
   * `field` is the design's own field, the header's (`compact`) and every
   * section's alike: the section's is the `search_field` part, so a page has
   * one search, its design's.
   */
  async function mountPage(fields: boolean[], field: Component = SearchInput) {
    const shown = ref(fields.map(() => true))
    const Page = defineComponent({
      setup: () => () => h('div', fields.map((isHeader, index) => shown.value[index]
        ? h('div', { 'data-field': index }, [isHeader ? h(field, { compact: true }) : h(field)])
        : null)),
    })
    const page = await mountSuspended(Page, { route: false })
    const at = (index: number) => page.get(`[data-field="${index}"]`)
    return {
      shown,
      opened: (index: number) => at(index).find('[data-test="palette"]').attributes('data-open') === 'true',
      paletteMounted: (index: number) => at(index).find('[data-test="palette"]').exists(),
      advertises: (index: number) => ({
        hint: at(index).findAll('kbd').length > 0,
        keys: at(index).findAll('[aria-keyshortcuts]').length > 0,
      }),
    }
  }
  const press = () => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }))

  beforeEach(() => {
    clearNuxtState('search-shortcut-fields')
  })

  // Webside's header field always shows its Ctrl K hint and states no
  // `aria-keyshortcuts`; what matters in both is that the section's field
  // says nothing and opens nothing.
  describe.each(trees(SearchInput, WebsideSearchInput))('with the $tree header', ({ tree, C: header }) => {
    const headerAdvertises = { hint: true, keys: tree === 'default' }

    it('belongs to the field of the header when a section draws one too: one palette, one hint', async () => {
      const page = await mountPage([false, true], header)

      press()

      await vi.waitFor(() => expect(page.opened(1)).toBe(true))
      expect(page.paletteMounted(0)).toBe(false)
      expect(page.advertises(1)).toEqual(headerAdvertises)
      expect(page.advertises(0)).toEqual({ hint: false, keys: false })
    })

    it('moves from the header to the section field when the header goes away', async () => {
      const page = await mountPage([true, false], header)
      expect(page.advertises(1).hint).toBe(false)

      page.shown.value = [false, true]
      await nextTick()
      press()

      await vi.waitFor(() => expect(page.opened(1)).toBe(true))
      expect(page.advertises(1)).toEqual({ hint: true, keys: true })
    })
  })

  it('belongs to a section field on a page whose header has none', async () => {
    const page = await mountPage([false])

    press()

    await vi.waitFor(() => expect(page.opened(0)).toBe(true))
    expect(page.advertises(0)).toEqual({ hint: true, keys: true })
  })

  it('belongs to the first of two section fields', async () => {
    const page = await mountPage([false, false])

    press()

    await vi.waitFor(() => expect(page.opened(0)).toBe(true))
    expect(page.paletteMounted(1)).toBe(false)
    expect(page.advertises(1)).toEqual({ hint: false, keys: false })
  })

  it('moves to the next section field when the first goes away', async () => {
    const page = await mountPage([false, false])

    page.shown.value = [false, true]
    await nextTick()
    press()

    await vi.waitFor(() => expect(page.opened(1)).toBe(true))
    expect(page.advertises(1)).toEqual({ hint: true, keys: true })
  })
})

describe('webside Search/Input', () => {
  beforeEach(() => {
    setTenant()
    setTenantFeatures({ blog: true })
  })

  it('names the field by its visible text on a desktop, with no label of its own to contradict it', async () => {
    const wrapper = await mountSuspended(WebsideSearchInput, { route: false, props: { compact: true } })

    // WCAG 2.5.3: an aria-label that is not the visible text (the key hint
    // is part of it) is a name a voice-control user cannot say.
    const button = wrapper.find('button')
    expect(button.attributes('aria-label')).toBeUndefined()
    expect(button.text()).toContain(inlineCopy('app/components/variants/webside/Search/Input.vue').search.placeholder)
  })

  // The class is the contract, the browser the real check (44x44 at 390,
  // 2026-11-13): the phone's 24px icon has a hit area 10px around it.
  it('is a 44px target on a phone', async () => {
    const wrapper = await mountSuspended(WebsideSearchInput, { route: false, props: { compact: true } })

    expect(wrapper.get('button').classes()).toEqual(expect.arrayContaining(['relative', 'max-lg:after:absolute', 'max-lg:after:-inset-2.5']))
  })

  it.each([
    ['articles and products while the store runs its blog', true, 'placeholder'],
    ['products alone without it', false, 'placeholder_products'],
  ])('names %s', async (_case, blog, key) => {
    setTenantFeatures({ blog })

    const wrapper = await mountSuspended(WebsideSearchInput, { route: false, props: { compact: true } })

    expect(wrapper.get('button').text()).toContain(inlineCopy('app/components/variants/webside/Search/Input.vue').search[key])
  })

  /**
   * webside's field in a shared section (the `search_field` part: the hero,
   * the search band): always the field, on every device, and a hero's (`lg`)
   * with the «Search» button beside it, the same palette behind both.
   */
  describe('in a section', () => {
    const copy = inlineCopy('app/components/variants/webside/Search/Input.vue').search

    it('draws the field with the section\u2019s own wording, or the design\u2019s', async () => {
      const own = await mountSuspended(WebsideSearchInput, { route: false, props: { placeholder: 'Τι θες να μάθεις;' } })
      const stock = await mountSuspended(WebsideSearchInput, { route: false })

      expect(own.get('button').text()).toContain('Τι θες να μάθεις;')
      expect(stock.get('button').text()).toContain(copy.placeholder)
    })

    it('gives a hero\u2019s field one tab stop: its «Search» button is for a pointer only, and opens the same palette', async () => {
      const wrapper = await mountSuspended(WebsideSearchInput, { route: false, props: { size: 'lg' } })

      const buttons = wrapper.findAll('button')
      expect(buttons.map(button => button.text())).toEqual([expect.stringContaining(copy.placeholder), copy.submit])
      expect(buttons.map(button => button.attributes('tabindex') !== '-1')).toEqual([true, false])
      expect(buttons.map(button => button.attributes('aria-hidden') !== 'true')).toEqual([true, false])
      // The hero's measures, 50px on a phone and 52px from `sm` up: the classes are the contract.
      expect(buttons[0]?.classes()).toEqual(expect.arrayContaining(['h-12.5', 'sm:h-13']))
      await buttons[1]?.trigger('click')
      await vi.waitFor(() => expect(wrapper.find('[data-test="palette"]').attributes('data-open')).toBe('true'))
    })
  })
})
