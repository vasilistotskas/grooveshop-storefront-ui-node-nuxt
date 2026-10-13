import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const { mockLog } = vi.hoisted(() => ({
  mockLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
mockNuxtImport('log', () => mockLog)

/**
 * Uncaught browser errors go to evlog's client transport as plain data:
 * Vue errors, startup errors, window errors and unhandled rejections, at
 * `error`; a chunk the browser could not download at `warn`. The plugin is
 * the instance the test app registered at boot, as in a real page, so
 * each test uses an error of its own (each distinct error is sent once).
 */
describe('error-reporting plugin', () => {
  beforeEach(() => {
    mockLog.error.mockClear()
    mockLog.warn.mockClear()
  })

  it('reports a Vue error with its lifecycle hint', async () => {
    const error = new Error('render blew up')

    await useNuxtApp().callHook('vue:error', error, null, 'render function')

    expect(mockLog.error).toHaveBeenCalledExactlyOnceWith({
      action: 'client:vue-error',
      error: expect.objectContaining({ name: 'Error', message: 'render blew up' }),
      info: 'render function',
    })
    expect(mockLog.warn).not.toHaveBeenCalled()
  })

  it('reports a startup error', async () => {
    const error = new Error('plugin failed')

    await useNuxtApp().callHook('app:error', error)

    expect(mockLog.error).toHaveBeenCalledExactlyOnceWith({
      action: 'client:app-error',
      error: expect.objectContaining({ message: 'plugin failed' }),
    })
  })

  it('reports an uncaught window error', () => {
    const error = new Error('click handler threw')

    window.dispatchEvent(new ErrorEvent('error', { error, message: error.message }))

    expect(mockLog.error).toHaveBeenCalledExactlyOnceWith({
      action: 'client:window-error',
      error: expect.objectContaining({ message: 'click handler threw' }),
    })
  })

  it('ignores a cross-origin "Script error." that carries no error', () => {
    window.dispatchEvent(new ErrorEvent('error', { message: 'Script error.' }))

    expect(mockLog.error).not.toHaveBeenCalled()
    expect(mockLog.warn).not.toHaveBeenCalled()
  })

  it('reports an unhandled promise rejection', () => {
    const reason = new Error('fetch rejected')
    const event = new Event('unhandledrejection') as PromiseRejectionEvent
    Object.defineProperty(event, 'reason', { value: reason })

    window.dispatchEvent(event)

    expect(mockLog.error).toHaveBeenCalledExactlyOnceWith({
      action: 'client:unhandled-rejection',
      error: expect.objectContaining({ message: 'fetch rejected' }),
    })
  })

  it('reports a chunk download failure that surfaces as a Vue error at warn level', async () => {
    const error = new TypeError('Failed to fetch dynamically imported module: https://shop.test/_nuxt/a.js')

    await useNuxtApp().callHook('vue:error', error, null, 'https://vuejs.org/error-reference/#runtime-13')

    expect(mockLog.error).not.toHaveBeenCalled()
    expect(mockLog.warn).toHaveBeenCalledExactlyOnceWith({
      action: 'client:vue-error',
      error: expect.objectContaining({ message: error.message }),
      info: 'https://vuejs.org/error-reference/#runtime-13',
    })
  })

  it('reports Nuxt chunk error hook at warn level', async () => {
    const error = new Error('Unable to preload CSS for /_nuxt/entry.css')

    await useNuxtApp().callHook('app:chunkError', { error })

    expect(mockLog.error).not.toHaveBeenCalled()
    expect(mockLog.warn).toHaveBeenCalledExactlyOnceWith({
      action: 'client:chunk-error',
      error: expect.objectContaining({ message: error.message }),
    })
  })
})
