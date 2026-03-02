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
  nitroApp.hooks.hook('evlog:enrich', (ctx) => {
    for (const enricher of enrichers) enricher(ctx)

    // Add tenant context to wide events
    const tenant = ctx.event?.context?.tenant
    if (tenant) {
      ctx.wide.tenantSchema = tenant.schemaName
      ctx.wide.tenantName = tenant.name
    }
  })
})
