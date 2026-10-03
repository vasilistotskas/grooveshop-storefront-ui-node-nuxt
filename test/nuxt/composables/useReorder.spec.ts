import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { failWith } from '~~/test/helpers/api'

/**
 * "Buy again": Django puts the order's products back in the cart, the
 * cart is reloaded, each added line is reported to analytics (the lines
 * bypassed the cart store's own add actions), and the shopper lands in
 * the cart — or hears that nothing could be added, or that it failed.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const { toastAdd, navigateToMock } = vi.hoisted(() => ({ toastAdd: vi.fn(), navigateToMock: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
mockNuxtImport('navigateTo', () => navigateToMock)

const REORDER = '/api/orders/7/reorder'

let refreshCart: MockInstance
let track: MockInstance

beforeEach(() => {
  const cart = useCartStore()
  refreshCart = vi.spyOn(cart, 'refreshCart').mockResolvedValue()
  track = vi.spyOn(cart, 'trackCartQuantityChange').mockImplementation(() => {})
})

describe('useReorder', () => {
  it('puts the order back in the cart, reports each added line and opens the cart', async () => {
    api.routes({ [REORDER]: { addedItems: [{ productId: 3, addedQuantity: 2 }, { productId: 4, requestedQuantity: 1 }], skippedItems: [] } })

    await useReorder().reorder(7)

    expect(api.callsTo(REORDER).map(call => call.options?.method)).toEqual(['POST'])
    expect(refreshCart).toHaveBeenCalled()
    expect(track.mock.calls.map(([productId, quantity]) => [productId, quantity])).toEqual([[3, 2], [4, 1]])
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('cart'))
  })

  it('says how many it added and how many are no longer sold', async () => {
    api.routes({ [REORDER]: { addedItems: [{ productId: 3, addedQuantity: 1 }], skippedItems: [{ productId: 9 }] } })

    await useReorder().reorder(7)

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      description: useNuxtApp().$i18n.t('reorder.success_with_skipped', { added: 1, skipped: 1 }),
    }))
  })

  it('stays put and warns when nothing could be added', async () => {
    api.routes({ [REORDER]: { addedItems: [], skippedItems: [{ productId: 9 }] } })

    await useReorder().reorder(7)

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'warning', title: useNuxtApp().$i18n.t('reorder.empty_title') }))
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('reports a failure and stays put', async () => {
    api.routes({ [REORDER]: failWith(500) })

    const { reorder, reordering } = useReorder()
    await reorder(7)

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(reordering.value).toBeNull()
  })

  it('names the order in flight and refuses a second one meanwhile', async () => {
    let settle!: (value: unknown) => void
    api.routes({
      [REORDER]: () => new Promise((resolve) => {
        settle = resolve
      }),
    })
    const { reorder, reordering } = useReorder()

    const first = reorder(7)
    await vi.waitFor(() => expect(reordering.value).toBe(7))
    await reorder(8)
    settle({ addedItems: [], skippedItems: [] })
    await first

    expect(api.callsTo('/api/orders/8/reorder')).toEqual([])
    expect(reordering.value).toBeNull()
  })
})
