import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import GiftCardInput from '~/components/Checkout/GiftCardInput.vue'

// useFetch routes through the mocked $fetch auto-import, so the
// settings toggle must be answered here — a bare {} default would
// leave the feature gate closed and nothing would render.
const defaultFetchImpl = (url: any) => {
  if (String(url).includes('/api/settings/get')) {
    return Promise.resolve({ value: 'true' })
  }
  return Promise.resolve({})
}
const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn((url: any) => {
    if (String(url).includes('/api/settings/get')) {
      return Promise.resolve({ value: 'true' })
    }
    return Promise.resolve({})
  }),
}))
mockNuxtImport('$fetch', () => mockFetch)

mockNuxtImport('useTenantStore', () => {
  return () => ({
    giftCardsEnabled: true,
    promotionsEnabled: true,
  })
})

// Runtime toggle answered by the settings proxy.
registerEndpoint('/api/settings/get', () => ({ value: 'true' }))

describe('CheckoutGiftCardInput', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockImplementation(defaultFetchImpl)
  })

  it('emits applied with the checked balance for a redeemable card', async () => {
    mockFetch.mockImplementation((url: any) => {
      if (String(url).includes('/api/giftcard/check')) {
        return Promise.resolve({
          code: 'GC-AAAA-BBBB-CCCC',
          balance: '25.00',
          currency: 'EUR',
          expiresAt: null,
          isRedeemable: true,
        })
      }
      return defaultFetchImpl(url)
    })

    const wrapper = await mountSuspended(GiftCardInput, {
      props: { appliedCards: [] },
    })
    await new Promise(resolve => setTimeout(resolve, 50))

    ;(wrapper.vm as any).formState.code = 'gc-aaaa-bbbb-cccc'
    await wrapper.vm.$nextTick()
    await wrapper.find('form').trigger('submit')
    await new Promise(resolve => setTimeout(resolve, 100))

    const emitted = wrapper.emitted('applied')
    expect(emitted).toBeDefined()
    expect(emitted![0]![0]).toEqual({
      code: 'GC-AAAA-BBBB-CCCC',
      balance: 25,
    })
  })

  it('rejects a card that is not redeemable', async () => {
    mockFetch.mockImplementation((url: any) => {
      if (String(url).includes('/api/giftcard/check')) {
        return Promise.resolve({
          code: 'GC-DEAD-DEAD-DEAD',
          balance: '0.00',
          currency: 'EUR',
          expiresAt: null,
          isRedeemable: false,
        })
      }
      return defaultFetchImpl(url)
    })

    const wrapper = await mountSuspended(GiftCardInput, {
      props: { appliedCards: [] },
    })
    await new Promise(resolve => setTimeout(resolve, 50))

    ;(wrapper.vm as any).formState.code = 'GC-DEAD-DEAD-DEAD'
    await wrapper.vm.$nextTick()
    await wrapper.find('form').trigger('submit')
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(wrapper.emitted('applied')).toBeUndefined()
    expect(wrapper.text()).toContain('δεν είναι διαθέσιμη')
  })

  it('refuses duplicates without calling the API', async () => {
    const wrapper = await mountSuspended(GiftCardInput, {
      props: {
        appliedCards: [{ code: 'GC-AAAA-BBBB-CCCC', balance: 25 }],
      },
    })
    await new Promise(resolve => setTimeout(resolve, 50))

    ;(wrapper.vm as any).formState.code = 'GC-AAAA-BBBB-CCCC'
    await wrapper.vm.$nextTick()
    await wrapper.find('form').trigger('submit')
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(wrapper.emitted('applied')).toBeUndefined()
    const checkCalls = mockFetch.mock.calls.filter(call =>
      String(call[0]).includes('/api/giftcard/check'))
    expect(checkCalls).toHaveLength(0)
  })

  it('hides the input once three cards are applied', async () => {
    const wrapper = await mountSuspended(GiftCardInput, {
      props: {
        appliedCards: [
          { code: 'GC-0001-0001-0001', balance: 10 },
          { code: 'GC-0002-0002-0002', balance: 10 },
          { code: 'GC-0003-0003-0003', balance: 10 },
        ],
      },
    })
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(wrapper.find('form').exists()).toBe(false)
  })
})
