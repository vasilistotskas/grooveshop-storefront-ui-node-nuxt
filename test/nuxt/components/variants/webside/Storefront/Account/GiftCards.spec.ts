import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { createError } from 'h3'
import { resolve } from 'node:path'
import YAML from 'yaml'
import WebsideGiftCards from '~/components/variants/webside/Storefront/Account/GiftCards.vue'
import type { GiftCard } from '~~/shared/openapi/types.gen'
import { makeGiftCard } from '~~/test/fixtures/giftCard'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * Webside's account gift cards: each linked card's code and balance, or
 * an invitation to buy one, or, when they could not load, that (never "no
 * cards") with a way to try again. The cards are `useMyGiftCards`, the request
 * the default page reads too.
 */
const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/variants/webside/Storefront/Account/GiftCards.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

let cards: GiftCard[] = []
let failing = false
let calls = 0

beforeEach(() => {
  cards = [makeGiftCard()]
  failing = false
  calls = 0
  clearNuxtData(['account-gift-cards'])
  registerEndpoint('/api/giftcard/mine', () => {
    calls++
    if (failing) throw createError({ statusCode: 502 })
    return { count: cards.length, next: null, previous: null, results: cards }
  })
})

async function mountPage() {
  const wrapper = await mountSuspended(WebsideGiftCards, { route: false })
  await flushPromises()
  return wrapper
}

describe('webside Storefront/Account/GiftCards', () => {
  it('shows each linked card\'s code and balance', async () => {
    cards = [makeGiftCard({ id: 1, balance: 42, initialValue: 50 })]

    const text = (await mountPage()).text()

    expect(text).toContain('GC-TEST-0001')
    expect(text).toContain(useNuxtApp().$i18n.n(42, 'currency'))
    expect(text).not.toContain(messages.empty)
  })

  it('invites the shopper to buy one when none is linked', async () => {
    cards = []

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain(messages.empty)
    expect(wrapper.get('a').attributes('href')).toBe('/gift-cards')
  })

  it('says the cards could not be loaded instead of "no cards"', async () => {
    failing = true

    const wrapper = await mountPage()

    expect(wrapper.get('[role="alert"]').text()).toContain(messages.load_error)
    expect(wrapper.text()).not.toContain(messages.empty)
  })

  it('asks again on "try again", and shows the cards once they load', async () => {
    failing = true
    const wrapper = await mountPage()
    const before = calls
    failing = false

    await wrapper.findAll('button').find(button => button.text() === messages.retry)!.trigger('click')
    await flushPromises()

    expect(calls).toBe(before + 1)
    await vi.waitFor(() => expect(wrapper.text()).toContain('GC-TEST-0001'))
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})
