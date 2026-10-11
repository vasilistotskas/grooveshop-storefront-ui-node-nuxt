import { describe, expect, it, vi } from 'vitest'
import { MAX_CLIENT_ERROR_REPORTS, createClientErrorReporter } from '~/utils/clientErrors'
import type { ClientErrorReport } from '~/utils/clientErrors'

/**
 * Browser errors reach the logs once each: one error can hit several
 * hooks, a failing render repeats, and a page must not spend the ingest
 * route's rate limit on one fault.
 */
describe('createClientErrorReporter', () => {
  it('sends a report tagged with where the error surfaced, with Vue’s hint', () => {
    const send = vi.fn<(report: ClientErrorReport) => void>()
    const error = new TypeError('cart is undefined')

    createClientErrorReporter(send)('vue-error', error, 'render function')

    expect(send).toHaveBeenCalledExactlyOnceWith({ action: 'client:vue-error', error, info: 'render function' })
  })

  it('reports the same error once, whichever hooks it reaches', () => {
    const send = vi.fn<(report: ClientErrorReport) => void>()
    const report = createClientErrorReporter(send)
    const error = new Error('mount failed')

    report('vue-error', error)
    report('app-error', error)
    report('vue-error', error)

    expect(send).toHaveBeenCalledOnce()
  })

  it('treats errors with different messages as distinct', () => {
    const send = vi.fn<(report: ClientErrorReport) => void>()
    const report = createClientErrorReporter(send)

    report('window-error', new Error('first'))
    report('window-error', new Error('second'))
    report('unhandled-rejection', 'network down')

    expect(send.mock.calls.map(([entry]) => entry.action)).toEqual([
      'client:window-error',
      'client:window-error',
      'client:unhandled-rejection',
    ])
  })

  it('stops after the per-page cap of distinct reports', () => {
    const send = vi.fn<(report: ClientErrorReport) => void>()
    const report = createClientErrorReporter(send)

    for (let i = 0; i < MAX_CLIENT_ERROR_REPORTS + 5; i++) {
      report('window-error', new Error(`error ${i}`))
    }

    expect(send).toHaveBeenCalledTimes(MAX_CLIENT_ERROR_REPORTS)
  })
})
