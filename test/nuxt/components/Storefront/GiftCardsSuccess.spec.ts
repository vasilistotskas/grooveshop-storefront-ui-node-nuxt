import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { Component } from 'vue'
import { resolve } from 'node:path'
import YAML from 'yaml'
import GiftCardsSuccess from '~/components/Storefront/GiftCardsSuccess.vue'
import WebsideGiftCardsSuccess from '~/components/variants/webside/Storefront/GiftCardsSuccess.vue'
import { failWith } from '~~/test/helpers/api'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'
import { trees } from '~~/test/helpers/trees'

/**
 * Where the Viva redirect lands: the page polls the purchase until the
 * provider's webhook has settled it, then says how it went. After the
 * attempt budget it stops polling and says the payment is still
 * processing — the webhook will settle it anyway.
 *
 * Both trees run `useGiftCardPurchaseStatus`, so one body covers them;
 * each says it in its own words (its `<i18n>` block).
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const UUID = 'a1b2c3d4-0000-4000-8000-000000000001'

// The real route runs the page's middleware (a store without gift cards
// 404s); only the query is under test.
const route = vi.hoisted(() => ({ query: {} as Record<string, string> }))
mockNuxtImport('useRoute', () => () => ({
  name: 'gift-cards-success',
  path: '/gift-cards/success',
  fullPath: '/gift-cards/success',
  params: {},
  matched: [],
  meta: {},
  hash: '',
  query: route.query,
}))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  vi.useRealTimers()
})

const SOURCES = {
  default: 'app/components/Storefront/GiftCardsSuccess.vue',
  webside: 'app/components/variants/webside/Storefront/GiftCardsSuccess.vue',
} as const

/** The headline each state shows, from the tree's own Greek copy. */
function headlines(path: string): Record<'pending' | 'paid' | 'failed' | 'processing', string> {
  const block = parseSfc(resolve(REPO, path)).customBlocks.find(b => b.type === 'i18n')!
  const el = YAML.parse(block.content).el
  return { pending: el.pending.title, paid: el.paid.title, failed: el.failed.title, processing: el.processing.title }
}

async function land(C: Component, query: Record<string, string> = { purchase: UUID }) {
  route.query = query
  const wrapper = await mountSuspended(C, { route: false })
  await flushPromises()
  return wrapper
}

const headline = (wrapper: Awaited<ReturnType<typeof land>>) => wrapper.find('h2').text()

describe.each(trees(GiftCardsSuccess, WebsideGiftCardsSuccess))('$tree Storefront/GiftCardsSuccess', ({ tree, C }) => {
  const says = headlines(SOURCES[tree])

  it('asks Django about the purchase in the URL', async () => {
    api.routes({ '/api/giftcard/purchase-status': { purchaseUuid: UUID, status: 'PENDING' } })

    await land(C)

    expect(api.callsTo('/api/giftcard/purchase-status')).toEqual([
      { url: '/api/giftcard/purchase-status', options: expect.objectContaining({ query: { uuid: UUID } }) },
    ])
  })

  it('says it is confirming while the purchase is pending', async () => {
    api.routes({ '/api/giftcard/purchase-status': { purchaseUuid: UUID, status: 'PENDING' } })

    const wrapper = await land(C)

    expect(headline(wrapper)).toBe(says.pending)
  })

  it('polls again after three seconds, and shows the purchase once it is paid', async () => {
    let calls = 0
    api.routes({
      '/api/giftcard/purchase-status': () => ({ purchaseUuid: UUID, status: ++calls < 2 ? 'PENDING' : 'PAID' }),
    })
    const wrapper = await land(C)

    await vi.advanceTimersByTimeAsync(3000)
    await flushPromises()

    expect(calls).toBe(2)
    expect(headline(wrapper)).toBe(says.paid)
  })

  it.runIf(tree === 'default')('leads on to more shopping once the purchase is paid', async () => {
    api.routes({ '/api/giftcard/purchase-status': { purchaseUuid: UUID, status: 'PAID' } })

    const wrapper = await land(C)

    expect(wrapper.find('section a').attributes('href')).toBe(useLocalePath()('index'))
  })

  it('stops polling once the purchase is settled', async () => {
    api.routes({ '/api/giftcard/purchase-status': { purchaseUuid: UUID, status: 'PAID' } })
    await land(C)

    await vi.advanceTimersByTimeAsync(30000)

    expect(api.callsTo('/api/giftcard/purchase-status')).toHaveLength(1)
  })

  it.each(['FAILED', 'CANCELED'])('offers another try when the purchase is %s', async (status) => {
    api.routes({ '/api/giftcard/purchase-status': { purchaseUuid: UUID, status } })

    const wrapper = await land(C)

    expect(headline(wrapper)).toBe(says.failed)
    expect(wrapper.find(`a[href="${useLocalePath()('gift-cards')}"]`).exists()).toBe(true)
  })

  it('treats a landing without a purchase as a failed one, and asks Django nothing', async () => {
    api.routes({ '/api/giftcard/purchase-status': { purchaseUuid: UUID, status: 'PAID' } })

    const wrapper = await land(C, {})

    expect(headline(wrapper)).toBe(says.failed)
    expect(api.callsTo('/api/giftcard/purchase-status')).toEqual([])
  })

  it('says the payment is still processing once the polling budget is spent', async () => {
    api.routes({ '/api/giftcard/purchase-status': failWith(502) })
    const wrapper = await land(C)

    await vi.advanceTimersByTimeAsync(3000 * 20)
    await flushPromises()

    expect(headline(wrapper)).toBe(says.processing)
    expect(api.callsTo('/api/giftcard/purchase-status')).toHaveLength(20)
  })
})
