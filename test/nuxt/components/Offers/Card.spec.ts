import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { resolve } from 'node:path'
import YAML from 'yaml'
import OffersCard from '~/components/Offers/Card.vue'
import type { PromotionCategoryRef, PromotionProductRef } from '~~/shared/openapi/types.gen'
import { makePromotion } from '~~/test/fixtures/promotion'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * One offer on the offers page: its benefit as a figure, whether it
 * needs a code, its terms, what it applies to — linked — and the code
 * to take to checkout, or the word that it applies by itself.
 */
const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Offers/Card.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

const product = (id: number, name = `Προϊόν ${id}`): PromotionProductRef => ({ id, name, slug: `proion-${id}`, mainImagePath: '' })
const category = (id: number, name: string): PromotionCategoryRef => ({ id, name, slug: `kat-${id}` })

const mountCard = (offer = makePromotion(), clipboardSupported = true) =>
  mountSuspended(OffersCard, { route: false, props: { offer, clipboardSupported } })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-04T10:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
})

describe('Offers/Card', () => {
  it('leads with the benefit as a figure, then the name and what it is', async () => {
    const wrapper = await mountCard(makePromotion({ name: 'Καλωσόρισμα', description: 'Στην πρώτη παραγγελία.' }))

    expect(wrapper.find('p').text()).toBe('10%')
    expect(wrapper.get('h2').text()).toBe('Καλωσόρισμα')
    expect(wrapper.text()).toContain('Στην πρώτη παραγγελία.')
  })

  it('says a benefit that is not a number in words', async () => {
    const wrapper = await mountCard(makePromotion({ benefitType: 'FREE_SHIPPING' }))

    expect(wrapper.find('p').text()).toBe('Δωρεάν αποστολή')
  })

  it.each([
    ['CODE', 'WELCOME10', messages.tag.code],
    ['AUTOMATIC', null, messages.tag.automatic],
  ] as const)('tags a %s offer "%s"', async (trigger, code, tag) => {
    const wrapper = await mountCard(makePromotion({ trigger, code }))

    expect(wrapper.text()).toContain(tag)
    expect(wrapper.text()).not.toContain(trigger === 'CODE' ? messages.tag.automatic : messages.tag.code)
  })

  it('lists the terms as chips, and none when there are none', async () => {
    const withTerms = await mountCard(makePromotion({ firstOrderOnly: true, maxDiscountAmount: 15 }))
    const without = await mountCard(makePromotion())

    expect(withTerms.findAll('li').map(li => li.text())).toEqual([
      expect.stringContaining('15,00'),
      'Μόνο για την πρώτη σου παραγγελία',
    ])
    expect(without.find('ul').exists()).toBe(false)
  })

  it('hands the code up in one tap', async () => {
    const wrapper = await mountCard()

    expect(wrapper.get('code').text()).toBe('WELCOME10')
    await wrapper.get('button[aria-label="Αντιγραφή κωδικού"]').trigger('click')

    expect(wrapper.emitted('copy')).toEqual([['WELCOME10']])
  })

  it('offers no copy button where the browser cannot copy', async () => {
    const wrapper = await mountCard(makePromotion(), false)

    expect(wrapper.get('code').text()).toBe('WELCOME10')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('says an automatic offer needs no code, rather than leaving the slot empty', async () => {
    const wrapper = await mountCard(makePromotion({ trigger: 'AUTOMATIC', code: null }))

    expect(wrapper.find('code').exists()).toBe(false)
    expect(wrapper.text()).toContain('Εφαρμόζεται αυτόματα στο καλάθι')
  })

  it('says when it ends as urgency, and that it does not when it never does', async () => {
    const ends = await mountCard(makePromotion({ endsAt: '2026-10-06T10:00:00Z' }))
    const open = await mountCard(makePromotion({ endsAt: null }))

    expect(ends.text()).toContain('Λήγει σε 2 ημέρες')
    expect(open.text()).toContain(messages.no_expiry)
  })

  describe('what it applies to', () => {
    it('shows product tiles that open each product, counts the rest, and has no "see products" link', async () => {
      const wrapper = await mountCard(makePromotion({
        targetScope: 'PRODUCTS',
        eligibleProducts: [product(1), product(2), product(3), product(4)],
        eligibleProductCount: 9,
      }))

      const links = wrapper.findAll('a')
      expect(links.map(link => link.attributes('href'))).toEqual([
        '/products/1/proion-1',
        '/products/2/proion-2',
        '/products/3/proion-3',
      ])
      expect(links.map(link => link.attributes('title'))).toEqual(['Προϊόν 1', 'Προϊόν 2', 'Προϊόν 3'])
      expect(wrapper.text()).toContain('+6 ακόμη')
    })

    it('links a category-scoped offer to each of its categories', async () => {
      const wrapper = await mountCard(makePromotion({
        targetScope: 'CATEGORIES',
        eligibleCategories: [category(7, 'Ακουστικά'), category(8, 'Ηχεία')],
      }))

      const links = wrapper.findAll('a')
      expect(links.map(link => link.text())).toEqual(['Ακουστικά', 'Ηχεία'])
      expect(links[0]!.attributes('href')).toBe('/products/category/7/kat-7')
    })

    it('names the gift an offer hands over', async () => {
      const wrapper = await mountCard(makePromotion({ benefitType: 'FREE_GIFT', rewardProducts: [product(5, 'Καλώδιο 20 εκ.')] }))

      expect(wrapper.text()).toContain(messages.reward)
      expect(wrapper.get('a').text()).toBe('Καλώδιο 20 εκ.')
      // Written beside the tile, not hidden for screen readers only.
      expect(wrapper.get('a').find('.sr-only').exists()).toBe(false)
    })

    it('links nowhere for an order-wide offer', async () => {
      const wrapper = await mountCard(makePromotion({ targetScope: 'ORDER' }))

      expect(wrapper.find('a').exists()).toBe(false)
    })
  })
})
