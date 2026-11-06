/**
 * `/checkout/success/{uuid}`: where a payment provider returns a shopper. It
 * keeps the arrival in the tab and forwards to the plain address.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import Forward from '~/pages/checkout/success/[uuid].vue'

const { route, navigateTo } = vi.hoisted(() => ({
  route: { params: { uuid: 'an-order' }, query: {} as Record<string, string | string[]> },
  navigateTo: vi.fn(),
}))
mockNuxtImport('useRoute', () => () => route)
mockNuxtImport('navigateTo', () => navigateTo)

beforeEach(() => {
  sessionStorage.clear()
  route.query = {}
})

describe('the order address', () => {
  it('keeps the order in the tab and replaces itself with the plain address', async () => {
    await mountSuspended(Forward, { route: false })
    await flushPromises()

    expect(readCheckoutArrival()).toEqual({ orderUuid: 'an-order', placed: false })
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith(expect.anything(), { replace: true })
  })

  it.each([
    ['Stripe', { session_id: 'cs_1' }, { sessionId: 'cs_1' }],
    ['Viva', { s: '731' }, { vivaOrderCode: '731' }],
    ['an offline order', { placed: '1' }, { placed: true }],
  ])('carries the return from %s', async (_label, query, expected) => {
    route.query = query

    await mountSuspended(Forward, { route: false })
    await flushPromises()

    expect(readCheckoutArrival()).toMatchObject({ orderUuid: 'an-order', ...expected })
  })
})
