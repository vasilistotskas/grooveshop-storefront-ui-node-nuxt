import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const { mockLog } = vi.hoisted(() => ({
  mockLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
mockNuxtImport('log', () => mockLog)

/**
 * Uncaught browser errors go to evlog's client transport: Vue errors,
 * startup errors, window errors and unhandled rejections. The plugin is
 * the instance the test app registered at boot, as in a real page, so
 * each test uses an error of its own (each distinct error is sent once).
 */
describe('error-reporting plugin', () => {
  beforeEach(() => {
    mockLog.error.mockClear()
  })

  it('reports a Vue error with its lifecycle hint', async () => {
    const error = new Error('render blew up')

    await useNuxtApp().callHook('vue:error', error, null, 'render function')

    expect(mockLog.error).toHaveBeenCalledExactlyOnceWith({ action: 'client:vue-error', error, info: 'render function' })
  })

  it('reports a startup error', async () => {
    const error = new Error('plugin failed')

    await useNuxtApp().callHook('app:error', error)

    expect(mockLog.error).toHaveBeenCalledExactlyOnceWith({ action: 'client:app-error', error })
  })

  it('reports an uncaught window error', () => {
    const error = new Error('click handler threw')

    window.dispatchEvent(new ErrorEvent('error', { error, message: error.message }))

    expect(mockLog.error).toHaveBeenCalledExactlyOnceWith({ action: 'client:window-error', error })
  })

  it('ignores a cross-origin "Script error." that carries no error', () => {
    window.dispatchEvent(new ErrorEvent('error', { message: 'Script error.' }))

    expect(mockLog.error).not.toHaveBeenCalled()
  })

  it('reports an unhandled promise rejection', () => {
    const reason = new Error('fetch rejected')
    const event = new Event('unhandledrejection') as PromiseRejectionEvent
    Object.defineProperty(event, 'reason', { value: reason })

    window.dispatchEvent(event)

    expect(mockLog.error).toHaveBeenCalledExactlyOnceWith({ action: 'client:unhandled-rejection', error: reason })
  })
})
