import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { resolve } from 'node:path'
import YAML from 'yaml'
import Offers from '~/components/Storefront/Offers.vue'
import { makePromotion } from '~~/test/fixtures/promotion'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * The public offers page: every live offer as a card, filtered by
 * whether it needs a code once there are enough to be worth filtering,
 * with a code copied in one tap and a kind word for an empty store.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const { copy, toastAdd } = vi.hoisted(() => ({ copy: vi.fn(() => Promise.resolve()), toastAdd: vi.fn() }))
mockNuxtImport('useClipboard', () => () => ({ copy, isSupported: ref(true) }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Storefront/Offers.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

const code = (id: number) => makePromotion({ id, name: `Κωδικός ${id}`, trigger: 'CODE', code: `CODE${id}` })
const automatic = (id: number) => makePromotion({ id, name: `Αυτόματη ${id}`, trigger: 'AUTOMATIC', code: null })

beforeEach(() => {
  clearNuxtData(['public-offers-el', 'public-offers-en'])
})

async function mountPage(offers = [code(1), code(2), automatic(3)]) {
  api.routes({ '/api/promotions': () => offers })
  const wrapper = await mountSuspended(Offers, { route: false })
  await flushPromises()
  return wrapper
}

const cards = (wrapper: VueWrapper) => wrapper.findAll('article').map(card => card.get('h2').text())
const tabs = (wrapper: VueWrapper) => wrapper.findAll('[role="tab"]')

describe('Storefront/Offers', () => {
  it('draws the heading and one card per offer, in order', async () => {
    const wrapper = await mountPage()

    expect(wrapper.get('h1').text()).toBe(messages.title)
    expect(cards(wrapper)).toEqual(['Κωδικός 1', 'Κωδικός 2', 'Αυτόματη 3'])
  })

  it('asks for the offers in the page language', async () => {
    await mountPage()

    expect(api.callsTo('/api/promotions')[0]!.options.query).toEqual({ languageCode: 'el' })
  })

  it('says there are no offers, with a way to the products, when there are none', async () => {
    const wrapper = await mountPage([])

    expect(wrapper.text()).toContain(messages.empty.title)
    expect(wrapper.findAll('a').some(link => link.attributes('href') === '/products')).toBe(true)
    expect(cards(wrapper)).toEqual([])
  })

  it('offers no filter for a short list', async () => {
    const wrapper = await mountPage([code(1), code(2), automatic(3), automatic(4)])

    expect(tabs(wrapper)).toHaveLength(0)
  })

  it('offers no filter when every offer is of one kind', async () => {
    const wrapper = await mountPage([code(1), code(2), code(3), code(4), code(5)])

    expect(tabs(wrapper)).toHaveLength(0)
  })

  describe('with enough offers of both kinds to filter', () => {
    const offers = [code(1), code(2), code(3), automatic(4), automatic(5)]

    it('counts each kind on its tab', async () => {
      const wrapper = await mountPage(offers)

      expect(tabs(wrapper).map(tab => tab.text())).toEqual([
        `${messages.filter.all}5`,
        `${messages.filter.code}3`,
        `${messages.filter.automatic}2`,
      ])
    })

    it.each([
      ['code', ['Κωδικός 1', 'Κωδικός 2', 'Κωδικός 3']],
      ['automatic', ['Αυτόματη 4', 'Αυτόματη 5']],
    ])('shows only the %s offers once that tab is chosen, and all again on "all"', async (kind, expected) => {
      const wrapper = await mountPage(offers)
      const tab = (label: string) => tabs(wrapper).find(candidate => candidate.text().startsWith(label))!

      // Reka's tab trigger selects on mousedown, not click.
      await tab(messages.filter[kind as 'code' | 'automatic']).trigger('mousedown')
      expect(cards(wrapper)).toEqual(expected)

      await tab(messages.filter.all).trigger('mousedown')
      expect(cards(wrapper)).toHaveLength(5)
    })
  })

  it('copies a code and says so, with the code', async () => {
    const wrapper = await mountPage([code(1)])

    await wrapper.get('button[aria-label="Αντιγραφή κωδικού"]').trigger('click')
    await flushPromises()

    expect(copy).toHaveBeenCalledWith('CODE1')
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Ο κωδικός αντιγράφηκε', description: 'CODE1' }))
  })
})
