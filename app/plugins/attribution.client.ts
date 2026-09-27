/**
 * Captures the landing page's traffic source for the order it may lead
 * to (see `useOrderAttribution`). Once per page load, synchronously at
 * plugin time and straight from `window.location`: that is the URL the
 * browser landed on, before any client navigation could replace it —
 * a deferred read (`onNuxtReady`) would record the second page when
 * the shopper clicks on before the idle callback fires. It is one
 * sessionStorage write, so it costs the first render nothing. The
 * landing query survives to this point: browser-language detection is
 * off (`detectBrowserLanguage: false`), so no i18n redirect replaces
 * the URL, and the server's www / canonical-host redirects keep
 * `event.path`, query included.
 */
export default defineNuxtPlugin(() => {
  const { capture } = useOrderAttribution()
  const { location } = window

  capture({
    query: Object.fromEntries(new URLSearchParams(location.search)),
    referrer: document.referrer,
    landingPath: location.pathname,
    ownOrigin: location.origin,
  })
})
