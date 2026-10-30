import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const toast = vi.hoisted(() => ({ add: vi.fn(), update: vi.fn() }))
mockNuxtImport('useToast', () => () => toast)

const failure = (body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  Object.assign(new Error('[POST] "/api/x": 400 Bad Request'), {
    status: 400,
    data: body,
    response: { status: 400, headers: new Headers(headers) },
  })

describe('useApiError().notify', () => {
  it('toasts the headline of the action with the reason of the server, under the id of the action', () => {
    const { notify } = useApiError()

    const described = notify('review:create', failure({ detail: 'Το καλάθι είναι άδειο.', code: 'cart_empty' }), { title: 'Η κριτική δεν δημιουργήθηκε' })

    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({
      id: 'review:create',
      title: 'Η κριτική δεν δημιουργήθηκε',
      description: 'Το καλάθι είναι άδειο.',
      color: 'error',
    }))
    expect(described.code).toBe('cart_empty')
  })

  it('uses the same id for a repeated failure, so Nuxt UI merges instead of stacking', () => {
    const { notify } = useApiError()

    notify('cart:add', failure({ detail: 'x' }))
    notify('cart:add', failure({ detail: 'x' }))

    expect(toast.add.mock.calls.map(([added]) => added.id)).toEqual(['cart:add', 'cart:add'])
  })

  it('offers «Λεπτομέρειες» when there is a code or a request id, and reveals them without closing the toast', () => {
    const { notify } = useApiError()
    notify('cart:add', failure({ detail: 'Εξαντλήθηκε.', code: 'out_of_stock' }, { 'x-request-id': 'req-5' }))

    const { actions } = toast.add.mock.calls[0]![0]
    expect(actions).toHaveLength(1)
    expect(actions[0].label).toBe('Λεπτομέρειες')

    const stopPropagation = vi.fn()
    actions[0].onClick({ stopPropagation })

    expect(stopPropagation).toHaveBeenCalled()
    expect(toast.update).toHaveBeenCalledWith('cart:add', expect.objectContaining({
      description: 'Εξαντλήθηκε. (Κωδικός: out_of_stock · Αναγνωριστικό αιτήματος: req-5)',
      actions: [],
      duration: 0,
    }))
  })

  it('offers no details when the failure carried neither a code nor a request id', () => {
    const { notify } = useApiError()

    notify('cart:add', failure({ detail: 'Εξαντλήθηκε.' }))

    expect(toast.add.mock.calls[0]![0].actions).toBeUndefined()
  })

  it('replaces a toast that was showing progress, whole: no spinner, countdown back, its own timeout', () => {
    const { notify } = useApiError()

    notify('cart:add', failure({ detail: 'Εξαντλήθηκε.' }))

    expect(toast.add.mock.calls[0]![0]).toMatchObject({
      icon: undefined,
      avatar: undefined,
      duration: undefined,
      progress: true,
      ui: undefined,
    })
  })
})
