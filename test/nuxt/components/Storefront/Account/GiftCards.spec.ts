import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { createError } from 'h3'
import { resolve } from 'node:path'
import YAML from 'yaml'
import GiftCards from '~/components/Storefront/Account/GiftCards.vue'
import type { GiftCard } from '~~/shared/openapi/types.gen'
import { makeGiftCard } from '~~/test/fixtures/giftCard'
import { FIXTURE_TIMESTAMP } from '~~/test/fixtures/product'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * The gift cards on the account: a card each — code, what is left of
 * what it held, when it expires — inked while it can pay, quiet once it
 * cannot (used up, expired, disabled); a failed load said as that, not
 * as "no cards"; and sending one to someone, with the store's amounts
 * when it states them.
 */
const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Storefront/Account/GiftCards.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

const answer = vi.hoisted(() => ({ cards: [] as GiftCard[], status: 200, settings: {} as Record<string, string> }))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(FIXTURE_TIMESTAMP))
  answer.cards = [makeGiftCard()]
  answer.status = 200
  answer.settings = {}
  clearNuxtData(['account-gift-cards', 'store-settings'])
  registerEndpoint('/api/giftcard/mine', () => {
    if (answer.status !== 200) throw createError({ statusCode: answer.status })
    return { count: answer.cards.length, next: null, previous: null, results: answer.cards }
  })
  registerEndpoint('/api/settings/public', () => ({ settings: answer.settings }))
})

afterEach(() => {
  vi.useRealTimers()
})

async function mountPage() {
  const wrapper = await mountSuspended(GiftCards, { route: false })
  await flushPromises()
  return wrapper
}

const cards = (wrapper: VueWrapper) => wrapper.findAll('li')
/** Euros as the page formats them (with the locale's no-break space). */
const euros = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

describe('Storefront/Account/GiftCards', () => {
  it('shows each card\'s code and what is left of what it held', async () => {
    answer.cards = [makeGiftCard({ id: 1, balance: 42, initialValue: 50 })]

    const wrapper = await mountPage()

    expect(cards(wrapper)).toHaveLength(1)
    expect(cards(wrapper)[0]!.text()).toContain('GC-TEST-0001')
    expect(cards(wrapper)[0]!.text()).toContain(euros(42))
    expect(cards(wrapper)[0]!.text()).toContain(`από ${euros(50)}`)
  })

  it('inks a card that can still pay and says when it expires, or that it never does', async () => {
    answer.cards = [
      makeGiftCard({ id: 1, expiresAt: '2028-09-30T00:00:00Z' }),
      makeGiftCard({ id: 2 }),
    ]

    const wrapper = await mountPage()

    // The ink is the "can still pay" signal the board draws.
    expect(cards(wrapper).map(card => card.classes('bg-inverted'))).toEqual([true, true])
    expect(cards(wrapper)[0]!.text()).toContain('Λήγει Σεπ 2028')
    expect(cards(wrapper)[1]!.text()).toContain(messages.no_expiry)
  })

  it.each([
    ['used up', { balance: 0 }, messages.used_up],
    ['disabled', { status: 'DISABLED' as const }, messages.disabled],
  ])('quiets a %s card and says so', async (_case, overrides, line) => {
    answer.cards = [makeGiftCard(overrides)]

    const wrapper = await mountPage()

    expect(cards(wrapper)[0]!.classes('bg-inverted')).toBe(false)
    expect(cards(wrapper)[0]!.text()).toContain(line)
  })

  it('quiets an expired card and says when it expired', async () => {
    answer.cards = [makeGiftCard({ expiresAt: '2025-06-01T00:00:00Z' })]

    const wrapper = await mountPage()

    expect(cards(wrapper)[0]!.classes('bg-inverted')).toBe(false)
    expect(cards(wrapper)[0]!.text()).toContain('Έληξε στις 1 Ιουν 2025')
  })

  it('says there are no cards yet, and still offers to buy one', async () => {
    answer.cards = []

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain(messages.empty)
    expect(wrapper.get('a').attributes('href')).toBe('/gift-cards')
  })

  it('says the cards could not be loaded instead of "no cards"', async () => {
    answer.status = 502

    const wrapper = await mountPage()

    expect(wrapper.get('[role="alert"]').text()).toContain(messages.load_error)
    expect(wrapper.text()).not.toContain(messages.empty)
  })

  it('names the amounts the store sells when it states both', async () => {
    answer.settings = { GIFT_CARD_MIN_AMOUNT: '10', GIFT_CARD_MAX_AMOUNT: '500' }

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain(`Από ${euros(10)} έως ${euros(500)}, με email.`)
  })

  it('names no amounts when the store does not state them', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain(messages.send.lead)
    expect(wrapper.text()).not.toContain('Από ')
  })
})
