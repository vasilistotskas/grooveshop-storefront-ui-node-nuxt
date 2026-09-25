import {
  createUserAgentEnricher,
  createGeoEnricher,
  createRequestSizeEnricher,
  createTraceContextEnricher,
} from 'evlog/enrichers'

export default defineNitroPlugin((nitroApp) => {
  const enrichers = [
    createUserAgentEnricher(),
    createGeoEnricher(),
    createRequestSizeEnricher(),
    createTraceContextEnricher(),
  ]
  // Enrichers run after an event is emitted and reach drains only; the
  // stdout line (what Vector ships) is printed before them. The tenant is
  // therefore set on the request logger in server/middleware/0.tenant.ts.
  nitroApp.hooks.hook('evlog:enrich', (ctx) => {
    for (const enricher of enrichers) enricher(ctx)
  })
})
