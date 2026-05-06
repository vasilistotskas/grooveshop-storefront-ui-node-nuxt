/**
 * Pure Nitro liveness probe — returns 200 immediately, no upstream deps.
 *
 * Why a separate endpoint from ``/api/health``:
 * - ``/api/health`` proxies to Django ``/health`` (DB+Redis+Celery
 *   check) and SWR-caches for 15s. Suitable for *readiness* (we
 *   want the pod removed from service rotation when upstream is
 *   down) but **not** liveness (we don't want Nuxt pods to restart
 *   when Django is the one that's broken — that just cascades).
 * - The k8s liveness probe needs to test "is Nitro itself
 *   responsive?" — nothing else. This endpoint touches zero
 *   upstream services and returns instantly.
 *
 * Why not probe ``/`` (the SSR homepage):
 * - ``/`` triggers a full SSR render: i18n catalog load, multiple
 *   ``$fetch`` calls to Django (settings, cart, etc.), Vue render.
 *   Under load, this can blow past a 3s probe timeout, producing
 *   noisy ``Liveness probe failed`` events even when the pod is
 *   serving real traffic fine.
 *
 * Path uses a leading underscore so it's distinguishable as
 * infrastructure-only and isn't picked up by sitemap or AI
 * crawlers via the usual route discovery.
 */
export default defineEventHandler(() => {
  return { ok: true }
})
