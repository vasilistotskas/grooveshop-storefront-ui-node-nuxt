import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import GiftCardsSuccess from '~/components/Storefront/GiftCardsSuccess.vue'
import { failWith } from '~~/test/helpers/api'

/**
 * Where the Viva redirect lands: the page polls the purchase until the
 * provider's webhook has settled it, then says how it went. After the
 * attempt budget it stops polling and says the payment is still
 * processing — the webhook will settle it anyway.
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

async function land(query: Record<string, string> = { purchase: UUID }) {
  route.query = query
  const wrapper = await mountSuspended(GiftCardsSuccess, { route: false })
  await flushPromises()
  return wrapper
}

const headline = (wrapper: Awaited<ReturnType<typeof land>>) => wrapper.find('section h2').text()

describe('Storefront/GiftCardsSuccess', () => {
  it('asks Django about the purchase in the URL', async () => {
    api.routes({ '/api/giftcard/purchase-status': { purchaseUuid: UUID, status: 'PENDING' } })

    await land()

    expect(api.callsTo('/api/giftcard/purchase-status')).toEqual([
      { url: '/api/giftcard/purchase-status', options: expect.objectContaining({ query: { uuid: UUID } }) },
    ])
  })

  it('says it is confirming while the purchase is pending', async () => {
    api.routes({ '/api/giftcard/purchase-status': { purchaseUuid: UUID, status: 'PENDING' } })

    const wrapper = await land()

    expect(headline(wrapper)).toBe('Επιβεβαιώνουμε την πληρωμή σου…')
  })

  it('polls again after three seconds, and shows the purchase once it is paid', async () => {
    let calls = 0
    api.routes({
      '/api/giftcard/purchase-status': () => ({ purchaseUuid: UUID, status: ++calls < 2 ? 'PENDING' : 'PAID' }),
    })
    const wrapper = await land()

    await vi.advanceTimersByTimeAsync(3000)
    await flushPromises()

    expect(calls).toBe(2)
    expect(headline(wrapper)).toBe('Η αγορά ολοκληρώθηκε')
    expect(wrapper.find('section a').attributes('href')).toBe(useLocalePath()('index'))
  })

  it('stops polling once the purchase is settled', async () => {
    api.routes({ '/api/giftcard/purchase-status': { purchaseUuid: UUID, status: 'PAID' } })
    await land()

    await vi.advanceTimersByTimeAsync(30000)

    expect(api.callsTo('/api/giftcard/purchase-status')).toHaveLength(1)
  })

  it.each(['FAILED', 'CANCELED'])('offers another try when the purchase is %s', async (status) => {
    api.routes({ '/api/giftcard/purchase-status': { purchaseUuid: UUID, status } })

    const wrapper = await land()

    expect(headline(wrapper)).toBe('Η πληρωμή δεν ολοκληρώθηκε')
    expect(wrapper.find('section a').attributes('href')).toBe(useLocalePath()('gift-cards'))
  })

  it('treats a landing without a purchase as a failed one, and asks Django nothing', async () => {
    api.routes({ '/api/giftcard/purchase-status': { purchaseUuid: UUID, status: 'PAID' } })

    const wrapper = await land({})

    expect(headline(wrapper)).toBe('Η πληρωμή δεν ολοκληρώθηκε')
    expect(api.callsTo('/api/giftcard/purchase-status')).toEqual([])
  })

  it('says the payment is still processing once the polling budget is spent', async () => {
    api.routes({ '/api/giftcard/purchase-status': failWith(502) })
    const wrapper = await land()

    await vi.advanceTimersByTimeAsync(3000 * 20)
    await flushPromises()

    expect(headline(wrapper)).toBe('Η πληρωμή επεξεργάζεται')
    expect(api.callsTo('/api/giftcard/purchase-status')).toHaveLength(20)
  })
})
