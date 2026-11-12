import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
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
   */
  async function mountPage(fields: boolean[]) {
    const shown = ref(fields.map(() => true))
    const Page = defineComponent({
      setup: () => () => h('div', fields.map((header, index) => shown.value[index]
        ? h('div', { 'data-field': index }, [h(SearchInput, { compact: header })])
        : null)),
    })
    const page = await mountSuspended(Page, { route: false })
    const field = (index: number) => page.get(`[data-field="${index}"]`)
    return {
      shown,
      opened: (index: number) => field(index).find('[data-test="palette"]').attributes('data-open') === 'true',
      paletteMounted: (index: number) => field(index).find('[data-test="palette"]').exists(),
      advertises: (index: number) => ({
        hint: field(index).findAll('kbd').length > 0,
        keys: field(index).findAll('[aria-keyshortcuts]').length > 0,
      }),
    }
  }
  const press = () => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }))

  beforeEach(() => {
    clearNuxtState('search-shortcut-fields')
  })

  it('belongs to the field of the header when a section draws one too: one palette, one hint', async () => {
    const page = await mountPage([false, true])

    press()

    await vi.waitFor(() => expect(page.opened(1)).toBe(true))
    expect(page.paletteMounted(0)).toBe(false)
    expect(page.advertises(1)).toEqual({ hint: true, keys: true })
    expect(page.advertises(0)).toEqual({ hint: false, keys: false })
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

  it('moves to the next field when its owner goes away', async () => {
    const page = await mountPage([true, false])
    expect(page.advertises(1).hint).toBe(false)

    page.shown.value = [false, true]
    await nextTick()
    press()

    await vi.waitFor(() => expect(page.opened(1)).toBe(true))
    expect(page.advertises(1)).toEqual({ hint: true, keys: true })
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
