import { beforeEach, describe, expect, it, vi } from 'vitest'
import { afterLoadWhenIdle, LOAD_IDLE_TIMEOUT_MS } from '~/utils/scheduling'

/** The page the stubbed `window` and `document` describe. */
const page = {
  readyState: 'loading' as DocumentReadyState,
  loadListeners: [] as (() => void)[],
  idleCallbacks: [] as { callback: () => void, timeout?: number }[],
}

/**
 * `afterLoadWhenIdle` holds third-party work until the page has loaded and
 * the main thread is idle: never on the visitor's first tap, which is
 * where gtag's load used to land (webside's INP, 2026-10-19).
 */
describe('afterLoadWhenIdle', () => {
  function settled(promise: Promise<void>) {
    let done = false
    promise.then(() => {
      done = true
    })
    return () => done
  }

  beforeEach(() => {
    page.readyState = 'loading'
    page.loadListeners = []
    page.idleCallbacks = []
    vi.stubGlobal('document', {
      get readyState() {
        return page.readyState
      },
    })
    vi.stubGlobal('window', {
      addEventListener: (type: string, listener: () => void) => {
        if (type === 'load') page.loadListeners.push(listener)
      },
      requestIdleCallback: (callback: () => void, options?: { timeout?: number }) => {
        page.idleCallbacks.push({ callback, timeout: options?.timeout })
        return page.idleCallbacks.length
      },
    })
  })

  it('waits for the load, then for an idle moment', async () => {
    const isDone = settled(afterLoadWhenIdle())

    await Promise.resolve()
    expect(isDone()).toBe(false)
    expect(page.idleCallbacks).toHaveLength(0)

    page.readyState = 'complete'
    page.loadListeners.forEach(listener => listener())
    await Promise.resolve()
    expect(isDone()).toBe(false)
    expect(page.idleCallbacks).toEqual([expect.objectContaining({ timeout: LOAD_IDLE_TIMEOUT_MS })])

    page.idleCallbacks[0]!.callback()
    await Promise.resolve()
    expect(isDone()).toBe(true)
  })

  it('goes straight to the idle wait on a page that has already loaded', async () => {
    page.readyState = 'complete'

    const isDone = settled(afterLoadWhenIdle())
    page.idleCallbacks[0]!.callback()
    await Promise.resolve()

    expect(page.loadListeners).toHaveLength(0)
    expect(isDone()).toBe(true)
  })
})
