/**
 * Shallow Nuxt-only liveness probe.
 *
 * Returns immediately without touching Django so a Django blip cannot
 * mark every Nuxt pod NotReady and shed traffic to the remaining
 * replica — the cascade that M5 in MULTI_TENANT_AUDIT.md is about.
 *
 * For full-stack health (Django + Redis + Celery), use `/api/health`.
 */
export default defineEventHandler((event) => {
  setHeader(event, 'cache-control', 'no-store')
  return { status: 'ok' as const }
})
