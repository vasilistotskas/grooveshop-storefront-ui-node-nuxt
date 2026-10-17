import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import OrderSpecimenButton from '~/components/Order/SpecimenButton.vue'
import { failWith } from '~~/test/helpers/api'

/**
 * The specimen receipt button: fetches the watermarked PDF and saves it,
 * by the order's uuid for a guest; a refusal is named in a toast.
 */
const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }))
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())

mockNuxtImport('$api', () => api)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const LABEL = 'Δείγμα απόδειξης (όχι φορολογικό παραστατικό)'
const UUID = '0b8e2d1c-5f6a-4c3e-9d7a-1e2f3a4b5c6d'

let saved: { href: string, download: string }[]
let revokedRightAfterClick: number

beforeEach(() => {
  saved = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    saved.push({ href: this.href, download: this.download })
    // The code after the click has run by the next microtask.
    queueMicrotask(() => {
      revokedRightAfterClick = vi.mocked(URL.revokeObjectURL).mock.calls.length
    })
  })
  URL.createObjectURL = vi.fn(() => 'blob:specimen')
  URL.revokeObjectURL = vi.fn()
})

async function click(props: { orderId: number, uuid?: string }) {
  const wrapper = await mountSuspended(OrderSpecimenButton, { props })
  await wrapper.get('button').trigger('click')
  await flushPromises()
  return wrapper
}

describe('Order/SpecimenButton', () => {
  it('is labelled as a specimen, not a tax document', async () => {
    const wrapper = await mountSuspended(OrderSpecimenButton, { props: { orderId: 3 } })

    expect(wrapper.get('button').text()).toBe(LABEL)
    expect(wrapper.get('button').attributes('aria-label')).toBe(LABEL)
  })

  it('fetches the PDF as a blob and saves it as specimen-<id>.pdf', async () => {
    api.routes({ '/api/orders/3/specimen': new Blob(['%PDF'], { type: 'application/pdf' }) })

    await click({ orderId: 3 })

    const call = api.callsTo('/api/orders/3/specimen')[0]!
    expect(call.options.responseType).toBe('blob')
    expect(call.options.query).toBeUndefined()
    expect(saved).toEqual([{ href: 'blob:specimen', download: 'specimen-3.pdf' }])
    // Not before the browser has taken the blob, but not leaked either.
    expect(revokedRightAfterClick).toBe(0)
    await vi.waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:specimen'))
    expect(toastAdd).not.toHaveBeenCalled()
  })

  it('sends a guest\'s uuid', async () => {
    api.routes({ '/api/orders/3/specimen': new Blob(['%PDF']) })

    await click({ orderId: 3, uuid: UUID })

    expect(api.callsTo('/api/orders/3/specimen')[0]!.options.query).toEqual({ uuid: UUID })
  })

  it.each([
    [404, 'Το δείγμα δεν είναι διαθέσιμο για αυτή την παραγγελία.'],
    [429, 'Πολλές αιτήσεις. Δοκίμασε ξανά σε ένα λεπτό.'],
    [403, 'Δοκίμασε ξανά σε λίγο.'],
    [500, 'Δοκίμασε ξανά σε λίγο.'],
  ])('names a %i in a toast and saves nothing', async (status, description) => {
    toastAdd.mockClear()
    api.routes({ '/api/orders/3/specimen': failWith(status) })

    await click({ orderId: 3 })

    expect(saved).toEqual([])
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error', description }))
  })
})
