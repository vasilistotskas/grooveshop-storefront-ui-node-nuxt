/**
 * The longest `afterLoadWhenIdle` waits for an idle moment once the page
 * has loaded: a page that never goes idle still gets the work done.
 */
export const LOAD_IDLE_TIMEOUT_MS = 5000

/**
 * Resolves once the page has fully loaded (`load`: every image, the LCP
 * one included) and the main thread is next idle, or `LOAD_IDLE_TIMEOUT_MS`
 * after the load at the latest. For work that is not the visitor's — a
 * third-party tag — so its long task lands while they read, not on their
 * taps. Browser only.
 */
export function afterLoadWhenIdle(): Promise<void> {
  return new Promise((resolve) => {
    const whenIdle = () => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => resolve(), { timeout: LOAD_IDLE_TIMEOUT_MS })
      }
      else {
        // A browser without requestIdleCallback: the load is the best signal there is.
        setTimeout(resolve, 0)
      }
    }
    if (document.readyState === 'complete') whenIdle()
    else window.addEventListener('load', whenIdle, { once: true })
  })
}
