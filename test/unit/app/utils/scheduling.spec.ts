import { beforeEach, describe, expect, it, vi } from 'vitest'
import { afterLoadWhenIdle, afterNextPaint, LOAD_IDLE_TIMEOUT_MS } from '~/utils/scheduling'

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

/**
 * `afterNextPaint` holds the part of a tap's work the visitor does not see
 * until the tap's frame is painted: gtag's consent update inside the cookie
 * banner's Accept was webside's commonest slow interaction (2026-11-01).
 */
describe('afterNextPaint', () => {
  it('resolves in a task queued after the next animation frame', async () => {
    const frames: (() => void)[] = []
    const tasks: (() => void)[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => frames.push(callback))
    vi.stubGlobal('setTimeout', (callback: () => void) => tasks.push(callback))
    let done = false
    afterNextPaint().then(() => {
      done = true
    })

    await Promise.resolve()
    expect(frames).toHaveLength(1)
    expect(tasks).toHaveLength(0)

    frames[0]!()
    await Promise.resolve()
    expect(tasks).toHaveLength(1)
    expect(done).toBe(false)

    tasks[0]!()
    await Promise.resolve()
    expect(done).toBe(true)
  })
})
