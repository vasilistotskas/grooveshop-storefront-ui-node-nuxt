/**
 * Gate for the "My reviews" account page.
 *
 * Single-tier: the per-tenant extra-setting `ACCOUNT_REVIEWS_ENABLED`.
 * This is a STORE preference the operator edits through their own
 * settings admin — not a plan flag, so there is no tenant-store tier
 * here (contrast app/middleware/loyalty-enabled.ts). Product-page
 * reviews are unaffected; only this account surface is governed.
 *
 * History: the page used to hide behind the storefront's
 * superuser-only preview mode, which only hid the MENU LINK — the
 * route itself was reachable by URL for any logged-in customer, so the
 * store owner's "keep it hidden" wish was cosmetic. This middleware
 * makes it real: disabled means a hard 404, same non-leaking semantics
 * as the loyalty gate.
 *
 * Fail OPEN on fetch failure: an unavailable settings endpoint must
 * not take the page down for stores that have it enabled (the Django
 * default is enabled).
 */
export default defineNuxtRouteMiddleware(async () => {
  // useRequestFetch forwards the incoming host during SSR — a bare
  // $fetch would resolve the PUBLIC schema's value for every tenant
  // (N1 pattern in MULTI_TENANT_AUDIT.md).
  const requestFetch = useRequestFetch()

  let enabled: boolean
  try {
    const setting = await requestFetch<{ value?: string }>(
      '/api/settings/get',
      { query: { key: 'ACCOUNT_REVIEWS_ENABLED' } },
    )
    enabled = (setting?.value ?? 'true').toLowerCase() === 'true'
  }
  catch {
    return
  }

  if (!enabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
})
