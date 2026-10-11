/**
 * Browser errors into the logs (`log.source:client` in VictoriaLogs).
 *
 * evlog's client transport ships only explicit `log.*` calls, so uncaught
 * Vue errors, startup errors, window errors and unhandled promise
 * rejections never left the browser: two client events reached production
 * in seven days. Each distinct error goes through `log.error` once per
 * page load (`createClientErrorReporter`); the ingest route is
 * rate-limited on the server.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const report = createClientErrorReporter(entry => log.error(entry))

  nuxtApp.hook('vue:error', (error, _instance, info) => {
    report('vue-error', error, info)
  })
  nuxtApp.hook('app:error', (error) => {
    report('app-error', error)
  })

  useEventListener(window, 'error', (event: ErrorEvent) => {
    // A cross-origin script (a pixel, an extension) reports only
    // "Script error." with no error object: nothing to act on.
    if (!event.error && event.message === 'Script error.') return
    report('window-error', event.error ?? event.message)
  })
  useEventListener(window, 'unhandledrejection', (event: PromiseRejectionEvent) => {
    report('unhandled-rejection', event.reason)
  })
})
