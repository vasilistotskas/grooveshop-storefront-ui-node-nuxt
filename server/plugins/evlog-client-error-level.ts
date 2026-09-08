/**
 * Downgrade client (4xx) errors from evlog's default `error` level to `warn`.
 *
 * evlog records every errored request as a wide event whose level is
 * `manualLevel ?? (hasError ? 'error' : …)` — it makes no distinction between
 * a server fault (5xx) and a client error (4xx). So benign client behaviour —
 * an unknown-route 404 (e.g. a bot probing `/meta.json`) or an allauth 401
 * ("not authenticated, here are your flows") — surfaces at `error` level and
 * drowns out genuine 5xx faults in monitoring/alerting.
 *
 * 4xx becomes `warn` (still kept/visible via the `evlog.sampling.keep`
 * config); 5xx stays `error`. Uses evlog's documented
 * `useLogger(event).setLevel()` on the request's wide-event logger, called
 * inside Nitro's `error` hook — which fires before the wide event is emitted
 * at request end, so the downgraded level takes effect. `isClientError` is
 * auto-imported from `server/utils/http-status`.
 *
 * One 4xx is exempt: a response that failed its own schema. `parseDataAs`
 * raises those as 422, so `isClientError` matched and the wide event was
 * downgraded — filing a Django/`shared/openapi` contract drift, which is
 * our fault and breaks the page for the shopper, as though the shopper had
 * sent something malformed. `isResponseContractError` is auto-imported
 * from `server/utils/parser`.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, ctx: { event?: { context?: { log?: unknown } } }) => {
    const event = ctx?.event
    // useLogger throws if evlog's request logger isn't initialised (an error
    // raised before the evlog plugin ran). Guard on it being present.
    if (!event?.context?.log || !isClientError(error)) return
    if (isResponseContractError(error)) return
    useLogger(event as Parameters<typeof useLogger>[0]).setLevel('warn')
  })
})
